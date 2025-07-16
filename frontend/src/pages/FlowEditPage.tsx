import { useEffect, useState } from 'react';
import { useParams, Route, Routes } from 'react-router-dom';
import axios from 'axios';

// Component
import StepEditModal from './StepEditModal';

// UI
import { FiTrash2, FiCopy, FiEdit } from "react-icons/fi";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { QRCodeCanvas } from "qrcode.react";
import { CiViewList, CiCirclePlus } from 'react-icons/ci';
import { FaRegEnvelope, FaRegCalendarTimes } from 'react-icons/fa';
import { MdOutlineDragIndicator } from 'react-icons/md';
import { LuHandHeart, LuTicket, LuClipboardList, LuAppWindow, LuNotepadText, LuRocket } from "react-icons/lu";
import { RiCoupon2Fill } from "react-icons/ri";
import { BsChatLeft } from "react-icons/bs";
import { IoMdStopwatch } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import { IoCaretDownOutline, IoCaretUpOutline } from "react-icons/io5";

// ----------- Funnel Rules Validator ------------
function validateFunnel(steps: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Antes de Email debe haber un popup_form con campo email
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].type === "email") {
            const prevForm = steps.slice(0, i).reverse().find(step => step.type === "popup_form");
            if (!prevForm) {
                errors.push(`Debe haber un Formulario antes del paso Email.`);
            } else if (
                !prevForm.config?.fields ||
                !Array.isArray(prevForm.config.fields) ||
                !prevForm.config.fields.some((field: any) => field.type === "email")
            ) {
                errors.push(`El Formulario antes de Email debe tener un campo de tipo email.`);
            }
        }
    }

    // 2. No puede haber dos emails seguidos
    for (let i = 0; i < steps.length - 1; i++) {
        if (steps[i].type === "email" && steps[i + 1].type === "email") {
            errors.push(`No puede haber dos pasos Email seguidos.`);
        }
    }

    // 3. Delay no puede ser el primer step después del menú
    if (steps[1]?.type === "delay") {
        errors.push("El primer paso después del menú no puede ser Delay.");
    }

    // 4. No puede haber dos Delay seguidos
    for (let i = 1; i < steps.length - 1; i++) {
        if (steps[i].type === "delay" && steps[i + 1].type === "delay") {
            errors.push(`No puede haber dos pasos Delay seguidos.`);
        }
    }

    // 5. Redemption solo si antes hay coupon
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].type === "redemption") {
            const hasCouponBefore = steps.slice(0, i).some(step => step.type === "popup_coupon");
            if (!hasCouponBefore) {
                errors.push(`Debe haber un paso Coupon antes de Redemption.`);
            }
        }
    }

    // 6. Expiration solo al final
    if (steps.some((step, idx) => step.type === "expiration" && idx !== steps.length - 1)) {
        errors.push(`El paso Expiration solo puede ir al final del funnel.`);
    }

    return { valid: errors.length === 0, errors };
}

// ------------ Sidebar -------------
const SIDEBAR = [
    { label: 'Pages', items: [{ label: 'Page', type: 'menu', icon: <LuAppWindow /> }] },
    {
        label: 'Popup',
        items: [
            { label: 'Text Only', type: 'popup_text', icon: <BsChatLeft /> },
            { label: 'Form', type: 'popup_form', icon: <LuClipboardList /> },
            { label: 'Coupon', type: 'popup_coupon', icon: <RiCoupon2Fill /> },
            { label: 'Ticket', type: 'ticket', icon: <LuTicket /> }
        ]
    },
    { label: 'Communications', items: [{ label: 'Email', type: 'email', icon: <FaRegEnvelope /> }] },
    {
        label: 'Actions', items: [
            { label: 'Delay', type: 'delay', icon: <IoMdStopwatch /> },
            { label: 'Redemption', type: 'redemption', icon: <LuHandHeart /> },
            { label: 'Expiration', type: 'expiration', icon: <FaRegCalendarTimes /> }
        ]
    }
];

const typeToIcon = (type: string) => {
    switch (type) {
        case 'menu': return <LuNotepadText className="text-2xl" />;
        case 'delay': return <IoMdStopwatch className="text-2xl" />;
        case 'popup_text': return <BsChatLeft className="text-2xl" />;
        case 'popup_form': return <LuClipboardList className="text-2xl" />;
        case 'popup_coupon': return <RiCoupon2Fill className="text-2xl" />;
        case 'ticket': return <LuTicket className="text-2xl" />;
        case 'email': return <FaRegEnvelope className="text-2xl" />;
        case 'redemption': return <LuHandHeart className="text-2xl" />;
        case 'expiration': return <FaRegCalendarTimes className="text-2xl" />;
        default: return <CiViewList className="text-2xl" />;
    }
};

const typeToLabel = (type: string) => {
    switch (type) {
        case 'menu': return 'Menu';
        case 'delay': return 'Delay';
        case 'popup_text': return 'Popup (Text Only)';
        case 'popup_form': return 'Popup (Form)';
        case 'popup_coupon': return 'Popup (Coupon)';
        case 'ticket': return 'Ticket';
        case 'email': return 'Email';
        case 'redemption': return 'Redemption';
        case 'expiration': return 'Expiration';
        default: return type;
    }
};

const fetchSteps = async (flowId: string, setSteps: (steps: any[]) => void) => {
    try {
        const { data } = await axios.get(`http://localhost:3000/api/flow-details/${flowId}/steps`);
        setSteps([
            { id: 'menu-fixed', type: 'menu', config: {}, order_index: 0 },
            ...data
        ]);
    } catch (err) {
        console.error("Error al cargar steps:", err);
    }
};

export function StepOptionsMenu({ onDelete, onDuplicate, onEdit }: {
    onDelete?: () => void;
    onDuplicate?: () => void;
    onEdit?: () => void;
}) {
    return (
        <div className="absolute left-[-60px] top-3 z-50 flex flex-col gap-2 animate-fade-in bg-white border border-gray-200 shadow rounded-xl p-2">
            <button
                className="p-2 border-b border-gray-200 hover:text-red-600 transition duration-300"
                title="Eliminar"
                onClick={onDelete}
            >
                <FiTrash2 className="text-black-500" />
            </button>
            <button
                className="p-2 border-b border-gray-200 hover:text-blue-600 transition duration-300"
                title="Eliminar"
                onClick={onDuplicate}
            >
                <FiCopy className="text-black-500" />
            </button>
            <button
                className="p-2 hover:text-green-600 transition duration-300"
                title="Editar"
                onClick={onEdit}
            >
                <FiEdit className="text-black-500" />
            </button>
        </div>
    );
}

export const deleteStepOrder = async (flowId: string) => {
    try {
        await axios.delete(`http://localhost:3000/api/flow-details/${flowId}/steps`);
        window.location.reload();
    } catch (err) {
        console.log("Error deleting steps:", err);
        throw err;
    }
};

// --------- MAIN PAGE ----------
export default function FlowEditPage() {
    const { id: flowId } = useParams();
    const [flow, setFlow] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [openSteps, setOpenSteps] = useState<string[]>([]);
    const [funnelErrors, setFunnelErrors] = useState<string[]>([]);

    // Modal
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [stepToEdit, setStepToEdit] = useState<any>(null);

    useEffect(() => {
        axios.get(`http://localhost:3000/api/flow-details/${flowId}`)
            .then(res => {
                setFlow(res.data);
                setSteps([
                    { id: 'menu-fixed', type: 'menu', config: {}, order_index: 0 },
                    ...(res.data.steps || [])
                ]);
            })
            .catch(err => console.error(err));
    }, [flowId]);

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const reordered = Array.from(steps);
        const [removed] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, removed);

        const reorderedWithIndex = reordered.map((step, idx) => ({
            ...step,
            order_index: idx
        }));

        // Validar funnel tras reordenar
        const { valid, errors } = validateFunnel(reorderedWithIndex);
        if (!valid) {
            setFunnelErrors(errors);
            return;
        } else {
            setFunnelErrors([]);
        }

        setSteps(reorderedWithIndex);
        await updateStepsOrder(flowId as string, reorderedWithIndex);
    };

    const toggleStepOpen = (id: string) => {
        setOpenSteps((prev) =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleAddStep = (type: string) => {
        const newStep = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            type,
            config: {},
            order_index: steps.length
        };

        const simulatedSteps = [...steps, newStep];
        const { valid, errors } = validateFunnel(simulatedSteps);

        if (!valid) {
            setFunnelErrors(errors);
            return;
        } else {
            setFunnelErrors([]);
        }

        setSteps(prev => [...prev, newStep]);

        (async () => {
            try {
                await axios.post(`http://localhost:3000/api/flow-details/${flowId}/steps`, {
                    steps: [newStep]
                });

                const { data } = await axios.get(`http://localhost:3000/api/flow-details/${flowId}/steps`);
                setSteps([
                    { id: 'menu-fixed', type: 'menu', config: {}, order_index: 0 },
                    ...data
                ]);
            } catch (err) {
                console.error("Error al agregar step:", err);
            }
        })();
    };

    const handleDuplicateStep = async (step: any) => {
        const duplicatedStep = {
            ...step,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            order_index: steps.length
        };

        const simulatedSteps = [...steps, duplicatedStep];
        const { valid, errors } = validateFunnel(simulatedSteps);

        if (!valid) {
            setFunnelErrors(errors);
            return;
        } else {
            setFunnelErrors([]);
        }

        try {
            await axios.post(`http://localhost:3000/api/flow-details/${flowId}/steps`, {
                steps: [duplicatedStep]
            });
            await fetchSteps(flowId as string, setSteps);
        } catch (err) {
            console.error("Error duplicando step:", err);
        }
    };

    const handleEditStep = (step: any) => {
        setStepToEdit(step);
        setEditModalOpen(true);
    };

    const handleSaveStep = async (updatedStep: any) => {
        setEditModalOpen(false);
        setStepToEdit(null);

        // Actualiza localmente
        setSteps(steps =>
            steps.map(s => s.id === updatedStep.id ? updatedStep : s)
        );

        // Actualiza en backend
        try {
            await axios.put(`http://localhost:3000/api/flow-details/${flowId}/steps/${updatedStep.id}`, {
                config: updatedStep.config
            });
            setEditModalOpen(false);
            setStepToEdit(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (!flow) return <div className="p-6">Loading...</div>;

    return (
        <div className="min-h-screen flex bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-96 bg-white border-r min-h-screen p-6 flex flex-col">
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold text-2xl mb-2">Flow Configuration</h2>
                    <p className="text-xs text-gray-500 mb-5 font-semibold">
                        Let's build your Flow together! Follow the steps to customize each section and make it uniquely yours.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="text-md font-medium text-black mb-1">Add a Step</div>
                    <p className="text-xs text-gray-500 mb-5 font-semibold">Choose the next step of your flow</p>
                </div>
                {/* Sidebar sections */}
                {SIDEBAR.map((section, i) => (
                    <div key={section.label} className="mb-3">
                        {i !== 0 && (
                            <div className="border-t border-gray-300 mb-3" />
                        )}
                        <div className="mb-1 text-xs font-medium text-black uppercase">{section.label}</div>
                        <ul>
                            {section.items.map((item, j) => (
                                <div key={item.label}>
                                    {section.label === 'Actions' && j !== 0 && (
                                        <div className="border-t border-gray-300" />
                                    )}
                                    <li
                                        className="flex items-center gap-2 pl-3 py-2 p-2 text-gray-700 hover:bg-gray-100 rounded cursor-pointer text-[15px]"
                                        onClick={() => item.type && handleAddStep(item.type)}
                                    >
                                        {item.icon && <span className="text-lg">{item.icon}</span>}
                                        <span>{item.label}</span>
                                    </li>
                                </div>
                            ))}
                        </ul>
                    </div>
                ))}
            </aside>

            {/* Main */}
            <main className="flex-1 h-screen overflow-y-auto scrollbar-stable flex flex-col items-center py-12 bg-gray-50">
                <div className="w-full max-w-lg">

                    {/* Rocket icon */}
                    <div className="flex justify-center mb-2">
                        <span className="bg-white rounded-full border-2 border-green-500 p-3 flex items-center">
                            <LuRocket className="text-green-500 text-3xl" />
                        </span>
                    </div>

                    {/* Steps: Drag & Drop + Expansion Preview */}
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="steps-droppable">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="flex flex-col gap-5 mt-2"
                                >
                                    {steps.map((step: any, idx: number) => (
                                        <Draggable draggableId={step.id} index={idx} key={step.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={
                                                        "rounded shadow bg-white border transition-shadow relative px-2 py-4 " +
                                                        (snapshot.isDragging ? "ring-2 ring-blue-300 " : "") +
                                                        (
                                                            (openSteps.includes(step.id) && step.type !== "menu")
                                                                ? "border-t-2 border-b-2 border-l border-r " +
                                                                "border-t-green-400 border-b-green-400 border-l-gray-200 border-r-gray-200 " +
                                                                "border-dashed"
                                                                : "border-gray-200"
                                                        )
                                                    }
                                                >
                                                    {/* --- Menú de opciones sólo cuando el step está abierto --- */}
                                                    {openSteps.includes(step.id) && (
                                                        <StepOptionsMenu
                                                            onDelete={() => handleDeleteStep(step.id)}
                                                            onDuplicate={() => handleDuplicateStep(step)}
                                                            onEdit={() => handleEditStep(step)}
                                                        />
                                                    )}

                                                    {/* Header */}
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none"
                                                        onClick={() => toggleStepOpen(step.id)}
                                                    >
                                                        <span className="text-2xl">{typeToIcon(step.type)}</span>
                                                        <span className="font-semibold flex-1 text-base">{typeToLabel(step.type)}</span>
                                                        <span className="text-gray-400">
                                                            {openSteps.includes(step.id) ? <IoCaretUpOutline /> : <IoCaretDownOutline />}
                                                        </span>
                                                        <span className="text-gray-400"><MdOutlineDragIndicator /></span>
                                                    </div>

                                                    {/* Animated Preview/Expanded content */}
                                                    <AnimatePresence initial={false}>
                                                        {openSteps.includes(step.id) && (
                                                            <motion.div
                                                                key={step.id}
                                                                initial={{ opacity: 0, y: -16 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -16 }}
                                                                transition={{ duration: 0.22, ease: "easeOut" }}
                                                                className="overflow-hidden"
                                                            >
                                                                <StepPreview step={step} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {/* Funnel Errors */}
                    {funnelErrors.length > 0 && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                            <strong>Errores en el funnel:</strong>
                            <ul className="list-disc list-inside text-sm mt-2">
                                {funnelErrors.map((e, idx) => (
                                    <li key={idx}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Botón "+" */}
                    <div className="flex justify-center items-center mt-7">
                        <button
                            className="rounded-full hover:bg-red-50 transition-all text-red-500 shadow-sm font-normal"
                            title="Add Step"
                        >
                            <CiCirclePlus size={60} />
                        </button>
                    </div>
                </div>
                <StepEditModal
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    step={stepToEdit}
                    onSave={handleSaveStep}
                />
            </main>
        </div>
    );
}

// ----------- StepPreview -----------
function StepPreview({ step }: { step: any }) {
    if (step.type === "popup_text") {
        return (
            <div className="bg-white border mx-5 mb-4 rounded-xl shadow px-8 py-6 flex flex-col items-center">
                <div className="font-bold text-center text-lg mb-2">
                    {step.config.title || "Want a Discount on Today’s Meal?"}
                </div>
                <div className="mb-3 text-center text-gray-700">
                    {step.config.description || "Join our text club and get 10 - 20% off 🍔"}
                </div>
                <button className="w-full bg-red-500 text-white py-2 rounded font-semibold text-base hover:bg-red-600 transition">
                    {step.config.button || "Join Club!"}
                </button>
            </div>
        );
    }
    if (step.type === "popup_form") {
        return (
            <div className="bg-white border mx-5 mb-4 rounded-xl shadow px-8 py-6 flex flex-col items-center">
                <div className="font-bold text-center text-lg mb-2">
                    {step.config.title || "Join Our List for Exclusive Promotions!"}
                </div>
                <div className="mb-2 text-center text-gray-700">
                    {step.config.description || "Complete the form below to claim your coupon!"}
                </div>
                <div className="w-full text-left mb-2 font-semibold">Email</div>
                <input
                    className="w-full border px-3 py-2 rounded mb-2 text-gray-700"
                    value={step.config.email || ""}
                    placeholder="email@example.com"
                    readOnly
                />
                <button className="w-full bg-red-500 text-white py-2 rounded font-semibold text-base hover:bg-red-600 transition">
                    {step.config.button || "Continue"}
                </button>
                <div className="mt-1 text-xs text-gray-500">
                    By pressing "Continue", you agree to the terms.
                </div>
            </div>
        );
    }
    if (step.type === "delay") {
        return (
            <div className="mx-5 mb-4 flex flex-col items-center pt-2 pb-2">
                <div className="font-poppins text-2xl text-red-500 my-2 tracking-widest flex gap-4 font-medium">

                    <div className='flex flex-col items-center'>
                        <span className='text-4xl'>00</span>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                            DAYS
                        </div>
                    </div>
                    <div className='flex flex-col items-center'>
                        <span className='text-4xl'>00</span>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                            HOURS
                        </div>
                    </div>
                    <div className='flex flex-col items-center'>
                        <span className='text-4xl'>00</span>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                            MINUTES
                        </div>
                    </div>
                    <div className='flex flex-col items-center'>
                        <span className='text-4xl'>{String(step.config.duration || "05").padStart(2, '0')}</span>
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                            SECONDS
                        </div>
                    </div>

                </div>
                <div className="text-gray-500 text-sm text-center mb-1">
                    Wait before moving to the next step
                </div>
            </div>
        );
    }
    if (step.type === "popup_coupon") {
        console.log(`http://localhost:5173/redeem?code=${step.coupon.code}`);
        return (
            <div className="mx-5 mb-4 flex flex-col items-center border border-dashed border-red-400 rounded-xl p-4 relative">
                <div className="w-full bg-white border border-gray-300 rounded-xl shadow px-4 pt-4 pb-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full border-2 border-gray-200 overflow-hidden w-10 h-10 flex items-center justify-center">
                            <img
                                src="https://randomuser.me/api/portraits/men/33.jpg"
                                alt="KFC"
                                className="w-10 h-10 object-cover"
                            />
                        </span>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">KFC</span>
                            <span className="text-xs text-gray-500">@KFC · Brazilian</span>
                        </div>
                    </div>
                    <div className="text-[13px] text-center text-gray-700 mb-1">
                        To redeem your coupon, simply show this code to a restaurant staff member and enjoy!
                    </div>
                    <div className="text-[11px] text-gray-400 text-center mb-2">
                        Redeemable In-Store Only
                    </div>
                    <div className="flex justify-between w-full mb-2 gap-2">
                        <div className="flex-1 border border-gray-200 rounded-md py-1 text-center text-xs bg-gray-50">
                            <div className="text-[10px] text-gray-400">Valid From</div>
                            <div className="font-semibold">7/7/2025</div>
                        </div>
                        <div className="flex-1 border border-gray-200 rounded-md py-1 text-center text-xs bg-gray-50">
                            <div className="text-[10px] text-gray-400">Valid Until</div>
                            <div className="font-semibold">7/21/2025</div>
                        </div>
                    </div>
                    <div className="w-full border-gray-200 rounded-md py-2 text-center text-lg font-bold mb-1 flex flex-col gap-2 font-poppins">
                        $10 Off
                        <div className="w-full text-xs flex items-center justify-center text-gray-400 mb-3 font-poppins">
                            <FaRegCalendarTimes className="mr-1" /> 7/21/2025
                        </div>
                    </div>
                    <div className="relative w-full flex items-center my-8 h-12 bg-white">
                        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-12 overflow-hidden z-20 flex justify-end">
                            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full"></div>
                        </div>
                        <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-6 h-12 overflow-hidden z-20 flex justify-end">
                            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full"></div>
                        </div>
                        <div className="w-full border-t-2 border-dashed border-gray-300 z-10"></div>
                    </div>
                    <div className="flex flex-col items-center gap-1 mt-2">
                        <span className="bg-white mb-1 flex flex-col items-center justify-center">
                            {/* Valor del cupón */}
                            {step.coupon && (
                                <>
                                    <div className="flex justify-center items-center bg-white p-4 rounded-2xl shadow mb-2">
                                        <QRCodeCanvas
                                            value={`http://localhost:5173/redeem?code=${step.coupon.code}`}
                                            size={140}
                                            bgColor="#fff"
                                            fgColor="#23272f"
                                            level="H"
                                            includeMargin={false}
                                            style={{ borderRadius: "16px" }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500 mt-2">
                                        Código: <span className="tracking-widest font-mono text-black">{step.coupon.code}</span>
                                    </span>
                                </>
                            )}
                        </span>
                        <span className="text-xs text-gray-500 mt-2">
                            Code: <span className="tracking-widest font-mono text-black">******</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    if (step.type === "email") {
        return (
            <div className="mx-5 mb-4 flex flex-col items-center border border-8 border-red-gray rounded-3xl p-10 relative">
                <div className="text-center text-3xl mb-2 font-poppins">
                    {step.config.title || "Claim your promo code from Second Dinerform"}
                </div>
                <div className="w-full bg-white border border-gray-300 rounded-xl shadow px-4 pt-4 pb-6 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full border-2 border-gray-200 overflow-hidden w-10 h-10 flex items-center justify-center">
                            <img
                                src="https://randomuser.me/api/portraits/men/33.jpg"
                                alt="KFC"
                                className="w-10 h-10 object-cover"
                            />
                        </span>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">KFC</span>
                            <span className="text-xs text-gray-500">@KFC · Brazilian</span>
                        </div>
                    </div>
                    <div className="text-[13px] text-center text-gray-700 mb-1">
                        To redeem your coupon, simply show this code to a restaurant staff member and enjoy!
                    </div>
                    <div className="text-[11px] text-gray-400 text-center mb-2">
                        Redeemable In-Store Only
                    </div>
                    <div className="flex justify-between w-full mb-2 gap-2">
                        <div className="flex-1 border border-gray-200 rounded-md py-1 text-center text-xs bg-gray-50">
                            <div className="text-[10px] text-gray-400">Valid From</div>
                            <div className="font-semibold">7/7/2025</div>
                        </div>
                        <div className="flex-1 border border-gray-200 rounded-md py-1 text-center text-xs bg-gray-50">
                            <div className="text-[10px] text-gray-400">Valid Until</div>
                            <div className="font-semibold">7/21/2025</div>
                        </div>
                    </div>
                    <div className="w-full border-gray-200 rounded-md py-2 text-center text-lg font-bold mb-1 flex flex-col gap-2 font-poppins">
                        $10 Off
                        <div className="w-full text-xs flex items-center justify-center text-gray-400 mb-3 font-poppins">
                            <FaRegCalendarTimes className="mr-1" /> 7/21/2025
                        </div>
                    </div>
                    <div className="relative w-full flex items-center my-8 h-12 bg-white">
                        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-12 overflow-hidden z-20 flex justify-end">
                            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full"></div>
                        </div>
                        <div className="absolute -right-7 top-1/2 -translate-y-1/2 w-6 h-12 overflow-hidden z-20 flex justify-end">
                            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-full"></div>
                        </div>
                        <div className="w-full border-t-2 border-dashed border-gray-300 z-10"></div>
                    </div>
                    <div className="flex flex-col items-center gap-1 mt-2">
                        <span className="bg-white mb-1 flex items-center justify-center">
                            <div className="flex justify-center items-center bg-white p-4 rounded-2xl shadow mb-2">
                                <QRCodeCanvas
                                    value={step.config.qrValue || "https://react-icons.github.io/react-icons/search/#q=dots"}
                                    size={140}
                                    bgColor="#fff"
                                    fgColor="#23272f"
                                    level="H"
                                    includeMargin={false}
                                    style={{ borderRadius: "16px" }}
                                />
                            </div>
                        </span>
                        <span className="text-xs text-gray-500 mt-2">
                            Code: <span className="tracking-widest font-mono text-black">******</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

// Eliminar step
const handleDeleteStep = async (id: string) => {
    deleteStepOrder(id);
};

const updateStepsOrder = async (flowId: string, steps: any[]) => {
    try {
        const minimalSteps = steps.map((step, idx) => ({
            id: step.id,
            order_index: idx
        }));
        await axios.put(`http://localhost:3000/api/flow-details/${flowId}/reorder`, {
            steps: minimalSteps
        });
    } catch (err) {
        console.error("Error updating step order:", err);
    }
};
