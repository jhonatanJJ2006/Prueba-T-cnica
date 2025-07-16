import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { GoPulse } from 'react-icons/go';
import { FaArrowLeft } from 'react-icons/fa6';

export default function FlowDetailsPage() {
  const { id } = useParams();
  const [flow, setFlow] = useState<any>(null);

  useEffect(() => {
    axios.get(`http://localhost:3000/api/flow-details/${id}`)
      .then(res => setFlow(res.data))
      .catch(err => console.error(err));
  }, [id]);

  if (!flow) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-white font-sans px-6 py-10">
      <div className="max-w-3xl mx-auto border p-6 rounded-lg shadow-sm bg-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GoPulse className="text-green-600" />
            {flow.name}
          </h1>
          <Link to="/" className="text-sm text-gray-500 hover:underline flex items-center gap-1">
            <FaArrowLeft />
            Back
          </Link>
        </div>

        <p className="text-gray-600 mb-2">
          <strong>Status:</strong> <span className="capitalize">{flow.status}</span>
        </p>
        <p className="text-gray-600 mb-4">
          <strong>End Date:</strong> {flow.end_date?.slice(0, 10) || 'Unlimited'}
        </p>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Steps</h2>
          {flow.steps.map((step: any, index: number) => (
            <div key={step.id} className="mb-4 p-4 border rounded-md bg-gray-50">
              <p className="font-medium text-gray-700 mb-1">Step {index + 1} - <span className="capitalize">{step.type}</span></p>
              <pre className="bg-white p-2 rounded text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(step.config, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
