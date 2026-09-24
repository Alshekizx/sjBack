import { useEffect, useState, type FormEvent } from "react"
import { adminApi } from "../../lib/adminApi"
import { supabase } from "../../lib/supabase"
import { collectionFields } from "./collectionFields"

type RecordData = Record<string, any> & { id: string }
type Choice = {
  id: string
  label: string
  course_id?: string
  metadata?: { mimetype?: string; size?: number }
}
const inputStyle = {
  background: "#13161f",
  color: "#e2e8f0",
  border: "1px solid #41465e",
}
const inputClass =
  "w-full px-3 py-2.5 rounded-lg text-sm focus:outline-2 focus:outline-indigo-400"
const localDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
}

export default function CollectionManager({
  title,
  collection,
  description,
}: {
  title: string
  collection: string
  description: string
}) {
  const config = collectionFields[collection]
  const [records, setRecords] = useState<RecordData[]>([])
  const [draft, setDraft] = useState<RecordData | null>(null)
  const [choices, setChoices] = useState<Record<string, Choice[]>>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    setRecords([])
    setDraft(null)
    setError("")
    setChoices({})
    setLoading(true)
    const sources = [
      ...new Set(
        config.fields.flatMap((field) => (field.source ? [field.source] : [])),
      ),
    ]
    Promise.all([
      adminApi.list<RecordData>(collection),
      Promise.all(
        sources.map(async (source) => {
          if (source === "media") {
            const { data, error } = await supabase.storage
              .from("media")
              .list("", { limit: 1000 })
            if (error) throw error
            return [
              source,
              (data || [])
                .filter((file) => file.id)
                .map((file) => ({
                  id: file.name,
                  label: file.name,
                  metadata: file.metadata,
                })),
            ] as const
          }
          const data = await adminApi.list<RecordData>(source)
          return [
            source,
            data.filter(item => source !== 'mcq' || item.status === 'published').map((item) => ({
              id: item.id,
              label:
                item.title || item.question || item.full_name || item.email || "Unnamed item",
              course_id: item.course_id,
            })),
          ] as const
        }),
      ),
    ])
      .then(([data, options]) => {
        if (active) {
          setRecords(data)
          setChoices(Object.fromEntries(options))
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [collection, config])

  const edit = (record?: RecordData) => {
    setError("")
    const values: RecordData = {
      id: crypto.randomUUID(),
      status: "draft",
      difficulty: "medium",
      question_type: "essay",
      marks: 1,
      duration_months: 6,
      sort_order: 0,
      options: ["", "", "", ""],
      correct_answer: 0,
      ...record,
    }
    for (const field of config.fields)
      if (field.type === "datetime-local" && values[field.key])
        values[field.key] = localDate(values[field.key])
    if (collection === "mcq")
      values.correct_answer = Number(
        typeof values.correct_answer === "object"
          ? (values.correct_answer?.option ?? 0)
          : values.correct_answer,
      )
    if (collection === 'lessons' && values.video_url?.startsWith('media:')) { values.video_file = values.video_url.slice(6); values.video_url = ''; }
    for (const field of config.fields) if (field.type === 'lines') values[field.key] = Array.isArray(values[field.key]) ? values[field.key].join('\n') : values[field.key] || '';
    setDraft(values)
  }
  const change = (key: string, value: unknown) =>
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            [key]: value,
            ...(key === "course_id" ? { lesson_id: "" } : {}),
          }
        : prev,
    )
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft || saving) return
    const record = { ...draft }
    for (const field of config.fields) {
      if (field.type === 'lines') { record[field.key] = String(record[field.key] || '').split('\n').map(item => item.trim()).filter(Boolean); continue; }
      if (field.type === 'multiselect') { record[field.key] = record[field.key] || []; continue; }
      const value = record[field.key]
      if (field.required && !String(value ?? "").trim()) {
        setError(`Please enter ${field.label.toLowerCase()}.`)
        return
      }
      if (field.type === "number")
        record[field.key] = value === "" || value == null ? null : Number(value)
      else if (field.type === "datetime-local")
        record[field.key] = value ? new Date(value).toISOString() : null
      else if (field.source && !value) record[field.key] = null
      else if (typeof value === "string") record[field.key] = value.trim()
    }
    if (collection === "mcq") {
      record.options = (record.options || []).map((option: string) =>
        option.trim(),
      )
      if (
        record.options.length < 2 ||
        record.options.some((option: string) => !option)
      ) {
        setError(
          "Enter at least two answer choices. Fill in or remove empty choices.",
        )
        return
      }
      if (
        !Number.isInteger(record.correct_answer) ||
        record.correct_answer < 0 ||
        record.correct_answer >= record.options.length
      ) {
        setError("Choose the correct answer.")
        return
      }
    }
    if (
      record.opens_at &&
      record.closes_at &&
      new Date(record.closes_at) <= new Date(record.opens_at)
    ) {
      setError("The end time must be after the start time.")
      return
    }
    if (collection === "resources") {
      const file = choices.media?.find(
        (item) => item.id === record.storage_path,
      )
      if (file) {
        record.mime_type = file.metadata?.mimetype
        record.file_size = file.metadata?.size
      }
    }
    if (collection === 'academic-levels') record.level = Number(record.level);
    if (collection === 'lessons' && record.video_file) record.video_url = `media:${record.video_file}`;
    setSaving(true)
    setError("")
    try {
      const saved = await adminApi.save(collection, record)
      setRecords((prev) =>
        prev.some((item) => item.id === saved.id)
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev],
      )
      setDraft(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save. Please try again.",
      )
    } finally {
      setSaving(false)
    }
  }
  const remove = async (record: RecordData) => {
    if (!confirm(`Delete “${record.title || record.question || config.name}”?`))
      return
    try {
      await adminApi.remove(collection, record.id)
      setRecords((prev) => prev.filter((item) => item.id !== record.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete.")
    }
  }
  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-200">{title}</h1>
        <p className="text-sm mt-1 text-slate-400">{description}</p>
      </div>
      {error && (
        <div role="alert" className="text-sm text-red-300">
          {error}
        </div>
      )}
      {!draft && collection !== "student-activity" && (
        <button
          disabled={loading}
          onClick={() => edit()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white disabled:opacity-50"
        >
          Add {config.name}
        </button>
      )}
      {draft && (
        <form
          onSubmit={save}
          className="rounded-xl p-5 space-y-4 bg-[#1a1d27] border border-[#2a2d3e]"
        >
          <h2 className="font-medium text-slate-200">
            {records.some((item) => item.id === draft.id) ? "Edit" : "Add"}{" "}
            {config.name}
          </h2>
          <p className="text-xs text-slate-400">
            Fields marked * are required.
          </p>
          <fieldset
            disabled={saving}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 disabled:opacity-60"
          >
            {config.fields.map((field) => {
              const id = `${collection}-${field.key}`
              const options: Choice[] = field.source
                ? (choices[field.source] || []).filter(
                    (item) =>
                      field.source !== "lessons" ||
                      !draft.course_id ||
                      item.course_id === draft.course_id,
                  )
                : (field.choices || []).map((value) => ({
                    id: value,
                    label: value.charAt(0).toUpperCase() + value.slice(1),
                  }))
              const value = draft[field.key] ?? ""
              const props = {
                id,
                value,
                required: field.required,
                className: inputClass,
                style: inputStyle,
                "aria-describedby": field.hint ? `${id}-hint` : undefined,
              }
              return (
                <div
                  key={field.key}
                  className={(field.type === "textarea" || field.type === "lines") ? "md:col-span-2" : ""}
                >
                  <label
                    htmlFor={id}
                    className="block text-sm text-slate-300 mb-2"
                  >
                    {field.label}
                    {field.required ? " *" : " (optional)"}
                  </label>
                  {field.type === "multiselect" ? (
              <fieldset className="space-y-2 max-h-64 overflow-y-auto" aria-label={field.label}>
                {options.map(option => <label key={option.id} className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={(Array.isArray(value) ? value : []).includes(option.id)} onChange={event => change(field.key, event.target.checked ? [...(Array.isArray(value) ? value : []), option.id] : value.filter((id: string) => id !== option.id))} />{option.label}</label>)}
                {!options.length && <p className="text-sm text-slate-400">Add questions in the question bank first.</p>}
              </fieldset>
            ) : field.type === "select" ? (
                    <select
                      {...props}
                      onChange={(event) =>
                        change(field.key, event.target.value)
                      }
                    >
                      <option value="">
                        {field.required
                          ? `Choose ${field.label.toLowerCase()}`
                          : "None selected"}
                      </option>
                      {value &&
                        !options.some((option) => option.id === value) && (
                          <option value={value}>
                            Current selection (unavailable)
                          </option>
                        )}
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (field.type === "textarea" || field.type === "lines") ? (
                    <textarea
                      {...props}
                      rows={field.key === "content" ? 10 : 4}
                      onChange={(event) =>
                        change(field.key, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      {...props}
                      type={field.type || "text"}
                      min={field.min}
                      step={field.type === "number" ? 1 : undefined}
                      onChange={(event) =>
                        change(field.key, event.target.value)
                      }
                    />
                  )}
                  {field.hint && (
                    <p
                      id={`${id}-hint`}
                      className="text-xs mt-1.5 text-slate-400"
                    >
                      {field.hint}
                    </p>
                  )}
                </div>
              )
            })}
            {collection === "mcq" && (
              <div className="md:col-span-2 space-y-3">
                <p className="text-sm text-slate-300">
                  Answer choices * — select the correct answer.
                </p>
                {(draft.options || []).map((option: string, index: number) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct-answer"
                      aria-label={`Mark answer ${index + 1} as correct`}
                      checked={draft.correct_answer === index}
                      onChange={() => change("correct_answer", index)}
                    />
                    <label className="sr-only" htmlFor={`answer-${index}`}>
                      Answer {index + 1}
                    </label>
                    <input
                      id={`answer-${index}`}
                      required
                      value={option}
                      placeholder={`Answer ${index + 1}`}
                      className={inputClass}
                      style={inputStyle}
                      onChange={(event) =>
                        change(
                          "options",
                          draft.options.map((text: string, i: number) =>
                            i === index ? event.target.value : text,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      disabled={draft.options.length <= 2}
                      aria-label={`Remove answer ${index + 1}`}
                      className="text-sm text-slate-300 disabled:opacity-30"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: draft.options.filter(
                            (_: string, i: number) => i !== index,
                          ),
                          correct_answer:
                            draft.correct_answer === index
                              ? 0
                              : draft.correct_answer > index
                                ? draft.correct_answer - 1
                                : draft.correct_answer,
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-indigo-300"
                  onClick={() => change("options", [...draft.options, ""])}
                >
                  Add answer choice
                </button>
              </div>
            )}
          </fieldset>
          <div className="flex gap-3">
            <button
              disabled={saving}
              type="submit"
              className="px-4 py-2 rounded-lg text-sm bg-indigo-500 text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${config.name}`}
            </button>
            <button
              disabled={saving}
              type="button"
              onClick={() => setDraft(null)}
              className="px-4 py-2 rounded-lg text-sm bg-slate-700 text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[#1a1d27] border border-[#2a2d3e]"
          >
            <div className="min-w-0">
              <div className="text-sm text-slate-200">
                {record.title ||
                  record.question ||
                  record.name ||
                  record.subject ||
                  `Untitled ${config.name}`}
              </div>
              <div className="text-xs truncate mt-1 text-slate-400">
                {record.description || record.status || record.type || "Saved"}
              </div>
            </div>
            {collection !== "student-activity" && <div className="flex gap-2">
              <button
                disabled={!!draft}
                onClick={() => edit(record)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 disabled:opacity-40"
              >
                Edit
              </button>
              <button
                disabled={!!draft}
                onClick={() => remove(record)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-950 text-red-300 disabled:opacity-40"
              >
                Delete
              </button>
            </div>}
          </div>
        ))}
        {loading ? (
          <p role="status" className="text-sm text-slate-400">
            Loading…
          </p>
        ) : (
          records.length === 0 &&
          !error && (
            <p className="text-sm py-10 text-center text-slate-400">
              No {title.toLowerCase()} yet.
            </p>
          )
        )}
      </div>
    </div>
  )
}
