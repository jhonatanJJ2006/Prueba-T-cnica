import { useEffect, useState } from "react";
import axios from "axios";

function getCodeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("code") || "";
}

export default function TicketRedeemPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState(getCodeFromURL());

  useEffect(() => {
    const codeInUrl = getCodeFromURL();
    if (codeInUrl) {
      setCode(codeInUrl);
      redeemTicket(codeInUrl);
    }
  }, []);

  const redeemTicket = async (ticketCode: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await axios.post("http://localhost:3000/api/tickets/redeem", { code: ticketCode });
      setResult(data.ticket || data.coupon || data); // según el backend
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al redimir el ticket");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 flex flex-col items-center">
        <h1 className="font-bold text-2xl mb-4">Redimir Ticket</h1>
        
        {!code && (
          <form
            onSubmit={e => {
              e.preventDefault();
              redeemTicket(code);
            }}
            className="w-full flex flex-col gap-3"
          >
            <input
              className="border rounded px-3 py-2 text-lg"
              placeholder="Código del ticket"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              disabled={loading}
            />
            <button
              className="bg-blue-600 text-white rounded py-2 font-semibold hover:bg-blue-700 transition"
              type="submit"
              disabled={loading || !code}
            >
              {loading ? "Redimiendo..." : "Redimir"}
            </button>
          </form>
        )}

        {loading && <div className="mt-3 text-blue-500">Redimiendo ticket...</div>}
        {error && <div className="mt-3 text-red-600">{error}</div>}
        {result && (
          <div className="mt-4 w-full bg-green-50 border border-green-300 rounded p-3">
            <div className="text-green-700 font-bold">¡Ticket redimido exitosamente!</div>
            <div className="text-xs text-gray-600">Código: <span className="font-mono">{result.code}</span></div>
            <div className="text-xs">Redimido el: {result.redeemed_at && new Date(result.redeemed_at).toLocaleString()}</div>
            <div className="text-xs">Estado: <span className="font-mono">{result.status}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
