import { cn } from '@/lib/utils';
import {
  ORDER_STATUS_COLORS, INVOICE_STATUS_COLORS, PO_STATUS_COLORS, SHIPMENT_STATUS_COLORS,
  type OrderStatus, type InvoiceStatus, type PoStatus, type ShipmentStatus,
} from '@/lib/constants';

type StatusType = 'order' | 'invoice' | 'po' | 'shipment';

interface Props {
  status: string;
  type: StatusType;
  className?: string;
}

const colorMaps = {
  order: ORDER_STATUS_COLORS,
  invoice: INVOICE_STATUS_COLORS,
  po: PO_STATUS_COLORS,
  shipment: SHIPMENT_STATUS_COLORS,
};

export function StatusBadge({ status, type, className }: Props) {
  const map = colorMaps[type] as Record<string, string>;
  const color = map[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
      color,
      className
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
