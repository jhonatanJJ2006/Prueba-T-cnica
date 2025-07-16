import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

type RedeemResult = {
  success: boolean;
  data?: any;
  message?: string;
} | null;

export default function RedeemPage() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<RedeemResult>(null);
  const [loading, setLoading] = useState(false);
  const code = params.get("code");

  const handleRedeem = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post("http://localhost:3000/api/coupons/redeem", {
        code,
        redeemed_by: "usuario@ejemplo.com"
      });
      setResult({ success: true, data });
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || "Error al redimir cupón"
      });
    }
    setLoading(false);
  };

  if (!code) {
    return <div className="p-8 text-center text-lg text-red-500">No se especificó código de cupón</div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-2">Redimir Cupón</h2>
        <div className="mb-4">Código: <span className="font-mono text-blue-700">{code}</span></div>
        {!result && (
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-semibold"
            onClick={handleRedeem}
            disabled={loading}
          >
            {loading ? "Redimiendo..." : "Redimir"}
          </button>
        )}
        {result && result.success && (
          <div className="mt-6 text-green-600 font-bold">
            Cupón redimido correctamente<br/>
            <span className="text-sm text-gray-700">({result.data.coupon.code})</span>
          </div>
        )}
        {result && !result.success && (
          <div className="mt-6 text-red-600 font-semibold">
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
