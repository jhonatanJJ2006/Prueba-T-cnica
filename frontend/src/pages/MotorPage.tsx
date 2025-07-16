import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

export default function FlowExecutionPage() {
  const { executionId } = useParams();
  const [step, setStep] = useState<any>(null);
  const [formValues, setFormValues] = useState<any>({});
  const [waiting, setWaiting] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStep = async (extraData?: any) => {
    try {
      const payload = { executionId, ...extraData };
      const { data } = await axios.post("http://localhost:3000/api/flow-execution/next", payload);
      setStep(data);
      setError("");
    } catch (err) {
      setError("Error obteniendo step");
    }
  };

  useEffect(() => {
    fetchStep();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [executionId]);

  const handleContinue = async () => {
    await fetchStep();
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchStep({ formValues });
    setFormValues({});
  };

  useEffect(() => {
    if (step && step.action === "waiting" && step.seconds && waiting === null) {
      let s = step.seconds;
      setWaiting(s);
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        s--;
        setWaiting(s);
        if (s <= 0) {
          clearInterval(intervalRef.current!);
          setWaiting(null);
          fetchStep();
        }
      }, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else if (step && step.action !== "waiting") {
      setWaiting(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [step]);

  if (error) return <div className="p-8 text-red-700">{error}</div>;
  if (!step) return <div className="p-8">Cargando...</div>;

  switch (step.action) {
    case "show_popup":
      return (
        <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2">{step.data.title}</h2>
          <p className="mb-4">{step.data.description}</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleContinue}>
            Continuar
          </button>
        </div>
      );

    case "show_form":
      return (
        <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-bold mb-3">{step.data.title || "Formulario"}</h2>
          <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
            {Array.isArray(step.data.fields) &&
              step.data.fields.map((field: any) => (
                <div key={field.name}>
                  <label className="block mb-1">{field.label}</label>
                  <input
                    className="border px-2 py-1 rounded w-full"
                    type={field.type}
                    name={field.name}
                    value={formValues[field.name] || ""}
                    required={field.required}
                    onChange={e => setFormValues((f: any) => ({ ...f, [field.name]: e.target.value }))}
                  />
                </div>
              ))}
            <button type="submit" className="bg-blue-600 text-white rounded py-2">Enviar</button>
          </form>
        </div>
      );

    case "waiting":
      return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow flex flex-col items-center">
          <div className="text-lg mb-4 font-bold">Espera {waiting ?? step.seconds} segundos para continuar...</div>
          <div className="text-5xl font-mono text-blue-700 mb-3">{waiting ?? step.seconds}</div>
          <div className="italic text-gray-400">Avanzará automáticamente</div>
        </div>
      );

    case "show_coupon":
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-xl font-bold mb-2">¡Cupón generado!</div>
          <div className="mb-3 text-gray-700">Muestra este QR en el local:</div>
          <QRCodeCanvas value={step.data.qr_url || step.data.qr_code_url} size={180} />
          <div className="mt-3 font-mono text-xl">{step.data.code}</div>
          <button className="mt-5 bg-blue-600 text-white rounded py-2 px-4" onClick={handleContinue}>Continuar</button>
        </div>
      );

    case "show_ticket":
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-xl font-bold mb-2">¡Ticket generado!</div>
          <div className="mb-3 text-gray-700">Escanea el QR para usar el ticket:</div>
          <QRCodeCanvas value={step.data.qr_url || step.data.qr_code_url} size={180} />
          <div className="mt-3 font-mono text-xl">{step.data.code}</div>
          <button className="mt-5 bg-blue-600 text-white rounded py-2 px-4" onClick={handleContinue}>Continuar</button>
        </div>
      );

    case "send_email":
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-xl font-bold mb-2">Email enviado</div>
          <div className="mb-3">{step.data.subject || "Revisa tu bandeja de entrada."}</div>
          <button className="mt-3 bg-blue-600 text-white rounded py-2 px-4" onClick={handleContinue}>Continuar</button>
        </div>
      );

    case "show_redemption":
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-xl font-bold mb-2">Redención</div>
          <div className="mb-4">{step.data.message || "Redime tu cupón con el staff"}</div>
          <button className="bg-blue-600 text-white rounded py-2 px-4" onClick={handleContinue}>Continuar</button>
        </div>
      );

    case "show_expiration":
      return (
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow p-8 flex flex-col items-center">
          <div className="text-xl font-bold mb-2 text-red-700">Este Flow ha expirado.</div>
        </div>
      );

    case "end":
      return (
        <div className="p-8 font-bold text-green-700 text-center text-2xl">¡Flow completado!</div>
      );

    default:
      return <div className="p-8">Step no soportado: {JSON.stringify(step)}</div>;
  }
}
