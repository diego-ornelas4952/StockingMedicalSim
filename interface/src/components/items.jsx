import { motion } from "framer-motion";

export default function Items({ item, onUpdate }) {
    const isCheck = item.isChecked || false;
    const comments = item.comments || "";
    const status = item.status || "Disponible";

    return (
        <motion.tr
            animate={{ backgroundColor: isCheck ? "#e6f4ff" : "#ffffff" }}
            transition={{ duration: 0.3 }}
        >
            <td style={{ textAlign: "center" }}>
                <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: 'var(--azul-oscuro)', cursor: 'pointer' }}
                    checked={isCheck}
                    onChange={(e) => onUpdate(item.id, 'isChecked', e.target.checked)} />
            </td>

            <td>
                <strong>{item.description}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: "gray" }}>Cantidad: {item.quantity}</span>
            </td>

            <td>{item.series_model}</td>

            <td>
                <select 
                    value={status} 
                    onChange={(e) => onUpdate(item.id, 'status', e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--azul-claro)', outline: 'none' }}
                >
                    <option value="Disponible">Disponible</option>
                    <option value="Ocupado">Ocupado</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                </select>
            </td>

            <td>
                <input
                    type="text"
                    value={comments}
                    onChange={(e) => onUpdate(item.id, 'comments', e.target.value)}
                    placeholder="Comentarios"
                    style={{
                        width: '90%',
                        padding: '8px',
                        border: '1px solid var(--azul-claro)',
                        borderRadius: '10px',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />
            </td>
        </motion.tr>
    )
}