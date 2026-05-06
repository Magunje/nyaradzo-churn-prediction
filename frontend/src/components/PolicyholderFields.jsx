import { fieldSections, normalizeFormPayload } from "../utils/policyholderForm";

function renderInput(field, value, onChange, referenceData) {
  const commonProps = {
    id: field.name,
    name: field.name,
    value,
    onChange,
    required: true,
    className:
      "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#18264b] focus:ring-2 focus:ring-[#18264b]/10",
  };

  if (field.type === "select") {
    const options = field.optionsKey ? referenceData?.[field.optionsKey] || [] : field.options || [];
    return (
      <select {...commonProps}>
        <option value="">Select...</option>
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    );
  }

  return <input {...commonProps} type={field.type} min={field.min} max={field.max} step={field.step} />;
}

export default function PolicyholderFields({ formData, setFormData, referenceData }) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const normalized = normalizeFormPayload(formData, { allowPartial: true });

  return (
    <div className="space-y-5">
      {fieldSections.map((section) => (
        <section key={section.title} className="table-card p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="font-display text-[1.55rem] text-slate-900">{section.title}</h3>
              <p className="text-sm text-slate-500">{section.description}</p>
            </div>
            {section.title === "Policy Signals" ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div>Estimated billing amount: ${normalized.billing_amount_usd?.toFixed?.(2) || "0.00"}</div>
                <div>Premium to income ratio: {((normalized.premium_to_income_ratio || 0) * 100).toFixed(2)}%</div>
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => (
              <label key={field.name} htmlFor={field.name} className="text-sm font-medium text-slate-700">
                {field.label}
                {renderInput(field, formData[field.name] ?? "", handleChange, referenceData)}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
