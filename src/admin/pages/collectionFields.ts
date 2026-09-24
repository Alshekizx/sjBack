export type Field = {
  key: string
  label: string
  type?: "textarea" | "number" | "url" | "datetime-local" | "select" | "multiselect" | "lines"
  required?: boolean
  min?: number
  choices?: string[]
  source?: "courses" | "lessons" | "students" | "media" | "mcq"
  hint?: string
}
const title: Field = { key: "title", label: "Title", required: true }
const description: Field = {
  key: "description",
  label: "Description",
  type: "textarea",
}
const course: Field = {
  key: "course_id",
  label: "Course",
  type: "select",
  source: "courses",
}
const lesson: Field = {
  key: "lesson_id",
  label: "Lesson",
  type: "select",
  source: "lessons",
}
const status: Field = {
  key: "status",
  label: "Status",
  required: true,
  type: "select",
  choices: ["draft", "published", "archived"],
}
const level: Field = {
  key: "academic_level",
  label: "Academic level",
  type: "select",
  choices: ["100L", "200L", "300L", "400L", "500L"],
}
const questionFields: Field[] = [
  { key: "question", label: "Question", type: "textarea", required: true },
  course,
  lesson,
  {
    key: "difficulty",
    label: "Difficulty",
    required: true,
    type: "select",
    choices: ["easy", "medium", "hard"],
  },
  { key: "marks", label: "Marks", type: "number", min: 1, required: true },
  { key: "explanation", label: "Answer explanation", type: "textarea" },
  status,
]
export const collectionFields: Record<string, {
  name: string
  fields: Field[]
}> = {
  "academic-levels": {
    name: "academic level",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "level", label: "Level", type: "select", choices: ["100", "200", "300", "400", "500"], required: true },
      description,
      { key: "duration_months", label: "Subscription length (months)", type: "number", min: 1, required: true },
      { key: "objectives", label: "Learning objectives", type: "lines", hint: "Write one objective on each line." },
      { key: "price", label: "Subscription price (NGN)", type: "number", min: 0, required: true },
      { key: "sort_order", label: "Display order", type: "number", min: 0 }, status,
    ],
  },
  lessons: {
    name: "lesson",
    fields: [
      title,
      { ...course, required: true },
      description,
      {
        key: "content",
        label: "Lesson notes",
        type: "textarea",
        hint: "Write or paste the lesson in plain text.",
      },
      {
        key: "video_url",
        label: "Video link",
        type: "url",
        hint: "Paste the full video link, starting with https://.",
      },
      { key: "video_file", label: "Uploaded video", type: "select", source: "media", hint: "Choose a video from Media Library, or enter a video link above." },
      { key: "sort_order", label: "Lesson order", type: "number", min: 0 },
      status,
    ],
  },
  resources: {
    name: "resource",
    fields: [
      title,
      description,
      course,
      lesson,
      {
        key: "storage_path",
        label: "File",
        type: "select",
        source: "media",
        required: true,
        hint: "Choose a file uploaded in Media Library.",
      },
      status,
    ],
  },
  mcq: { name: "question", fields: questionFields },
  essays: {
    name: "essay question",
    fields: [{ key: "question_type", label: "Question type", type: "select", choices: ["essay", "problem"], required: true }, ...questionFields.map((field) =>
      field.key === "explanation" ? { ...field, label: "Model answer" } : field,
    )],
  },
  exams: {
    name: "exam",
    fields: [
      title,
      description,
      level,
      {
        key: "duration_minutes",
        label: "Time limit (minutes)",
        type: "number",
        min: 1,
      },
      {
        key: "opens_at",
        label: "Start date and time",
        type: "datetime-local",
        hint: "Times use your device’s local time zone.",
      },
      { key: "question_ids", label: "Exam questions", type: "multiselect", source: "mcq", hint: "Choose published multiple-choice questions for this exam." },
      { key: "closes_at", label: "End date and time", type: "datetime-local" },
      status,
    ],
  },
  "student-activity": {
    name: "activity",
    fields: [
      title,
      {
        key: "student_id",
        label: "Student",
        type: "select",
        source: "students",
        required: true,
      },
      description,
      {
        key: "type",
        label: "Activity type",
        type: "select",
        choices: ["learning", "progress", "examination"],
      },
    ],
  },
}
