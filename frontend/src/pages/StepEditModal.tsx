import { useState, useEffect } from "react";

type StepEditModalProps = {
  open: boolean;
  onClose: () => void;
  step: any;
  onSave: (step: any) => void;
};

export default function StepEditModal({
  open,
  onClose,
  step,
  onSave,
}: StepEditModalProps) {
  const [form, setForm] = useState<any>(step?.config || {});

  useEffect(() => {
    setForm(step?.config || {});
  }, [step]);

  if (!open || !step) return null;

  // Genérico para cualquier input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Para campos dinámicos en popup_form
  const addFormField = () => {
    setForm({
      ...form,
      fields: [...(form.fields || []), { type: "text", label: "" }],
    });
  };
  const updateFormField = (idx: number, field: any) => {
    const newFields = [...(form.fields || [])];
    newFields[idx] = field;
    setForm({ ...form, fields: newFields });
  };
  const removeFormField = (idx: number) => {
    const newFields = [...(form.fields || [])];
    newFields.splice(idx, 1);
    setForm({ ...form, fields: newFields });
  };

  let content = null;
  switch (step.type) {
    case "popup_text":
      content = (
        <div className="flex flex-col gap-3">
          <label>Título</label>
          <input
            name="title"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.title || ""}
            onChange={handleChange}
          />
          <label>Descripción</label>
          <textarea
            name="description"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.description || ""}
            onChange={handleChange}
          />
          <label>Texto del Botón</label>
          <input
            name="button"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.button || ""}
            onChange={handleChange}
          />
        </div>
      );
      break;

    case "delay":
      content = (
        <div className="flex flex-col gap-3">
          <label>Tiempo de espera (segundos)</label>
          <input
            name="duration"
            type="number"
            min={1}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.duration || ""}
            onChange={handleChange}
          />
        </div>
      );
      break;

    case "email":
      content = (
        <div className="flex flex-col gap-3">
          <label>Asunto del Email</label>
          <input
            name="subject"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.subject || ""}
            onChange={handleChange}
          />
          <label>Contenido del Email</label>
          <textarea
            name="body"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.body || ""}
            onChange={handleChange}
          />
        </div>
      );
      break;

    case "popup_form":
      content = (
        <div className="flex flex-col gap-3">
          <label>Título</label>
          <input
            name="title"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.title || ""}
            onChange={handleChange}
          />
          <label>Descripción</label>
          <textarea
            name="description"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.description || ""}
            onChange={handleChange}
          />
          <label>Campos del Formulario:</label>
          {(form.fields || []).map((field: any, idx: number) => (
            <div
              key={idx}
              className="flex gap-3 items-center mb-2 bg-gray-50 rounded-lg px-2 py-2 shadow-sm"
            >
              <select
                value={field.type}
                onChange={e =>
                  updateFormField(idx, { ...field, type: e.target.value })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none text-base bg-white shadow-sm"
              >
                <option value="text">Texto</option>
                <option value="email">Email</option>
                <option value="number">Número</option>
                <option value="tel">Teléfono</option>
              </select>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
                placeholder="Label"
                value={field.label}
                onChange={e =>
                  updateFormField(idx, { ...field, label: e.target.value })
                }
              />
              <button
                className="text-red-500 hover:bg-red-100 rounded-full p-1 ml-2 transition"
                onClick={() => removeFormField(idx)}
                type="button"
                title="Eliminar campo"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="bg-gray-200 rounded px-2 py-1 w-fit text-sm font-semibold hover:bg-gray-300 transition"
            onClick={addFormField}
            type="button"
          >
            + Agregar Campo
          </button>
        </div>
      );
      break;

    case "popup_coupon":
      content = (
        <div className="flex flex-col gap-3">
          <label>Tipo de beneficio</label>
          <select
            name="benefitType"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.benefitType || ""}
            onChange={e =>
              setForm((f: any) => ({ ...f, benefitType: e.target.value }))
            }
          >
            <option value="">Seleccionar</option>
            <option value="fixed">Descuento fijo ($)</option>
            <option value="percent">Descuento porcentual (%)</option>
            <option value="free_product">Producto/s gratis</option>
          </select>

          {form.benefitType === "fixed" && (
            <>
              <label>Monto ($)</label>
              <input
                name="fixedAmount"
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
                value={form.fixedAmount || ""}
                onChange={handleChange}
              />
            </>
          )}

          {form.benefitType === "percent" && (
            <>
              <label>Porcentaje (%)</label>
              <input
                name="percentAmount"
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
                value={form.percentAmount || ""}
                onChange={handleChange}
              />
            </>
          )}

          {form.benefitType === "free_product" && (
            <>
              <label>Productos gratuitos</label>
              <input
                name="freeProducts"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
                value={form.freeProducts || ""}
                onChange={handleChange}
                placeholder="Ej: Hamburguesa, Papas"
              />
            </>
          )}
        </div>
      );
      break;

    case "ticket":
      content = (
        <div className="flex flex-col gap-3">
          <label>Precio por ticket ($)</label>
          <input
            name="price"
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.price || ""}
            onChange={handleChange}
          />
          <label>Descripción del ticket</label>
          <textarea
            name="description"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none shadow-sm"
            value={form.description || ""}
            onChange={handleChange}
          />
        </div>
      );
      break;

    default:
      content = <div>No hay configuración para este tipo.</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white rounded-2xl shadow-lg p-7 min-w-[350px] relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl text-gray-400 hover:text-black"
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4">Editar Step</h2>
        {content}
        <button
          className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold transition"
          onClick={() => onSave({ ...step, config: form })}
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
