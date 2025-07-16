import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from "uuid";

// Sweat Alert
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
const MySwal = withReactContent(Swal);

// UI
import { CiSearch } from 'react-icons/ci';
import { HiPlusCircle } from 'react-icons/hi';
import { FaChevronDown, FaChartBar, FaRegTrashAlt } from 'react-icons/fa';
import { IoClose, IoLinkSharp, IoQrCodeOutline } from 'react-icons/io5';
import { GoPulse } from 'react-icons/go';
import { LuEye } from "react-icons/lu";
import { MdContentCopy } from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";

type Flow = {
    id: string;
    name: string;
    status: string;
    end_date: string;
};

export default function FlowsPage() {
    const [flows, setFlows] = useState<Flow[]>([]);
    const [name, setName] = useState('');
    const [showInput, setShowInput] = useState(false);

    useEffect(() => {
        axios.get('http://localhost:3000/api/flows')
            .then(res => setFlows(res.data))
            .catch(err => console.error(err));
    }, []);

    const createFlow = async () => {

        if (!name.trim()) {
            await MySwal.fire({
                icon: 'warning',
                title: 'Nombre requerido',
                text: 'Por favor ingresa un nombre para el flow.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'bg-yellow-500 text-white hover:bg-yellow-600 font-semibold rounded px-5 py-2'
                }
            });
            return;
        }

        try {
            const res = await axios.post('http://localhost:3000/api/flows', {
                name,
                status: 'active',
                end_date: '2025-12-31T23:59:59'
            });
            setFlows(prev => [...prev, { id: res.data.id, name, status: 'active', end_date: '2025-12-31' }]);
            setName('');
            setShowInput(false);
        } catch (err) {
            console.error(err);
        }
    };

    // --- BORRAR FLOW ---
    const handleDeleteFlow = async (id: string) => {
        const result = await MySwal.fire({
            title: <span style={{ fontWeight: 700, fontSize: "1.5rem" }}>¿Eliminar flow?</span>,
            html: (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <i className="fas fa-trash-alt" style={{ fontSize: '3.5rem', color: '#ff5252', marginBottom: 10 }} />
                    <div style={{ fontSize: '1.1rem', color: '#444' }}>
                        Esta acción <b>no se puede deshacer</b>.
                    </div>
                </div>
            ),
            showCancelButton: true,
            confirmButtonColor: undefined,
            cancelButtonColor: undefined,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: "#fff",
            customClass: {
                confirmButton: 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-400 font-semibold rounded px-5 py-2',
                cancelButton: 'bg-gray-200 text-gray-700 hover:bg-gray-300 rounded px-5 py-2 ml-2',
                popup: 'rounded-2xl px-8 py-8'
            },
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`http://localhost:3000/api/flows/${id}`);
            setFlows(prev => prev.filter(flow => flow.id !== id));
            MySwal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'El flow fue eliminado.',
                showConfirmButton: false,
                timer: 1200
            });
        } catch (err) {
            MySwal.fire('Error', 'No se pudo eliminar el flow.', 'error');
            console.error(err);
        }
    };

    const handleStartFlow = async (flowId: string) => {
        try {
            const { data } = await axios.post("http://localhost:3000/api/flow-execution/start", {
                flowId,
                userId: uuidv4()
            });
            window.open(`/flow-execute/${data.executionId}`, "_blank");
        } catch (err) {
            alert("Error iniciando Flow");
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans px-6 py-10">
            <div className="max-w-6xl mx-auto border p-6 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">Flows</h1>
                        <p className="text-gray-600 text-sm max-w-xl">
                            Build and manage your customer engagement strategies with flows, coupons, tickets, and emails. Choose from proven templates or create your own to maximize results.
                        </p>
                    </div>

                    <div>
                        {showInput ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Flow name"
                                    className="border border-gray-300 px-3 py-2 rounded-md"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <button
                                    onClick={createFlow}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md"
                                >
                                    Create
                                </button>
                                <button onClick={() => setShowInput(false)}>✕</button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowInput(true)}
                                className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-900 flex items-center gap-2"
                            >
                                <HiPlusCircle className="text-2xl text-white" />
                                Create Flow
                                <FaChevronDown className="text-sm" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-4 relative">
                    <CiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full border border-gray-200 pl-10 pr-8 py-2 rounded-md bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                    />
                    <IoClose className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flows.map((flow) => (
                        <div key={flow.id} className="border rounded-xl p-4 shadow-sm bg-white flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold text-lg">{flow.name}</h3>
                                    <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 text-xs font-semibold rounded-md">
                                        <GoPulse className="w-4 h-4" />
                                        {flow.status.charAt(0).toUpperCase() + flow.status.slice(1)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Campaign End Date: {flow.end_date ? flow.end_date.slice(0, 10) : 'Unlimited'}
                                </p>
                            </div>

                            <div className="border-t pt-3 mt-4 flex justify-between items-center text-gray-500 text-sm">
                                <div className="flex gap-3 text-lg">
                                    <Link to={`/flow/${flow.id}`} className="cursor-pointer hover:text-black" title="View">
                                        <LuEye />
                                    </Link>
                                    <IoLinkSharp className="cursor-pointer hover:text-black" title="Copy link" />
                                    <MdContentCopy className="cursor-pointer hover:text-black" title="Copy" />
                                    <FiExternalLink
                                        className="cursor-pointer hover:text-black"
                                        title="Open external"
                                        onClick={() => handleStartFlow(flow.id)}
                                    />
                                    <FaChartBar className="cursor-pointer hover:text-black" title="Stats" />
                                    <IoQrCodeOutline className="cursor-pointer hover:text-black" title="QR" />
                                    <FaRegTrashAlt
                                        className="cursor-pointer hover:text-red-600"
                                        title="Delete"
                                        onClick={() => handleDeleteFlow(flow.id)}
                                    />
                                </div>

                                <Link
                                    to={`/flow/${flow.id}/edit`}
                                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                                >
                                    Edit
                                </Link>
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
