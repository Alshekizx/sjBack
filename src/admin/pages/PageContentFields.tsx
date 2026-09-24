// Plain form controls for the structured content consumed by the public website.
export const contentTemplates: Record<string, any> = {
  home: { heading: '', introduction: '', features: [{ title: '', description: '' }], steps: [{ title: '', description: '' }], testimonials: [{ name: '', level: '', quote: '', university: '' }], faqs: [{ question: '', answer: '' }] },
  about: { heading: '', introduction: '', sections: [{ title: '', text: '' }], benefits: [''] },
  contact: { introduction: '', email: '', phone: '', location: '', support_hours: '', response_message: '' },
  pricing: { introduction: '', benefits: [{ title: '', description: '' }], faqs: [{ question: '', answer: '' }] },
  'academic-levels': { introduction: '' },
  terms: { heading: '', sections: [{ title: '', text: '' }] },
  privacy: { heading: '', sections: [{ title: '', text: '' }] },
  faq: { faqs: [{ question: '', answer: '' }] },
};
const labelFor = (key: string) => key.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());
const emptyValue = (value: any): any => Array.isArray(value) ? [] : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, emptyValue(entry)])) : typeof value === 'number' ? 0 : '';
export default function PageContentFields({ value, onChange, template = {}, path = 'page-content' }: { value: any; onChange: (value: any) => void; template?: any; path?: string }) {
  return <div className="space-y-4">{Object.entries({ ...template, ...value }).map(([key, fallback]) => {
    const entry = value?.[key] ?? (Array.isArray(fallback) ? [] : fallback);
    const id = `${path}-${key}`;
    if (Array.isArray(entry)) return <fieldset key={key} className="border border-slate-700 rounded-lg p-3 space-y-3">
      <legend className="text-sm text-slate-300 px-1">{labelFor(key)}</legend>
      {entry.map((item, index) => <div key={index} className="space-y-2 border-b border-slate-700 pb-3">
        {typeof item === 'object' && item !== null ? <PageContentFields value={item} template={template?.[key]?.[0] || {}} path={`${id}-${index}`} onChange={next => onChange({ ...value, [key]: entry.map((old, i) => i === index ? next : old) })} /> : <label className="block text-xs text-slate-300">{labelFor(key)} {index + 1}<textarea value={String(item)} onChange={event => onChange({ ...value, [key]: entry.map((old, i) => i === index ? event.target.value : old) })} className="w-full mt-1 p-2 rounded bg-slate-900 text-slate-200" /></label>}
        <button type="button" className="text-xs text-red-300" onClick={() => onChange({ ...value, [key]: entry.filter((_, i) => i !== index) })}>Remove item</button>
      </div>)}
      <button type="button" className="text-sm text-indigo-300" onClick={() => onChange({ ...value, [key]: [...entry, emptyValue(template?.[key]?.[0] ?? entry[0] ?? '')] })}>Add item</button>
    </fieldset>;
    if (entry && typeof entry === 'object') return <fieldset key={key}><legend>{labelFor(key)}</legend><PageContentFields value={entry} template={template?.[key]} path={id} onChange={next => onChange({ ...value, [key]: next })} /></fieldset>;
    return <div key={key}><label htmlFor={id} className="block text-xs text-slate-300 mb-2">{labelFor(key)}</label><textarea id={id} rows={key.includes('text') || key.includes('description') ? 4 : 2} value={String(entry ?? '')} onChange={event => onChange({ ...value, [key]: event.target.value })} className="w-full p-3 rounded bg-slate-900 text-slate-200 text-sm" /></div>;
  })}</div>;
}
