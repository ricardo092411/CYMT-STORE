import { site } from "@/data/site";
import { formatPrice } from "@/lib/utils";

/**
 * Customer details captured at checkout.
 * El Salvador shipping fields.
 */
export interface OrderCustomer {
  name: string;
  department: string;
  municipality: string;
  address: string;
  reference: string;
}

/**
 * A single order line derived from a cart item.
 */
export interface OrderLine {
  name: string;
  type?: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
}

/**
 * Build a fully formatted WhatsApp order message (in Spanish)
 * containing the store, every line with color/size/qty/price, the
 * shipping details and the total.
 */
export function buildOrderMessage(
  lines: OrderLine[],
  customer: OrderCustomer,
  total: number,
): string {
  const linesText = lines
    .map((line, index) => {
      const lineTotal = line.price * line.quantity;
      const label = `${line.name}${line.type ? ` (${line.type})` : ""}`;
      return (
        `${index + 1}. *${label}*\n` +
        `   • Color: ${line.color}\n` +
        `   • Talla: ${line.size}\n` +
        `   • Cantidad: ${line.quantity} × ${formatPrice(line.price)} = *${formatPrice(lineTotal)}*`
      );
    })
    .join("\n\n");

  return (
    `*${site.name.toUpperCase()}* — Nuevo Pedido 🛒\n\n` +
    `👤 *Datos de envío*\n` +
    `Nombre: ${customer.name}\n` +
    `Departamento: ${customer.department}\n` +
    `Municipio: ${customer.municipality}\n` +
    `Dirección: ${customer.address}\n` +
    `Referencia: ${customer.reference || "—"}\n\n` +
    `🧾 *Pedido*\n${linesText}\n\n` +
    `💰 *Total: ${formatPrice(total)}*\n\n` +
    `_Nota: ${site.productionNote}_`
  );
}

/**
 * Produce the final wa.me link. If a store phone number is configured in
 * site.whatsapp.number it opens a direct chat; otherwise it opens WhatsApp
 * with the message pre-filled so the customer can send it to the store.
 */
export function whatsappOrderUrl(message: string): string {
  const text = encodeURIComponent(message);
  const number = (site.whatsapp.number || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
