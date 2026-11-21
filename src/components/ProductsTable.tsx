import { useMemo } from 'react'
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'

export type ProductTableRow = {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellPrice: number
  stock: number
}

const features = tableFeatures({})
const columnHelper = createColumnHelper<typeof features, ProductTableRow>()

type ProductsTableProps = {
  products: ProductTableRow[]
  canEdit: boolean
  onEdit: (productId: string) => void
}

export function ProductsTable({ products, canEdit, onEdit }: ProductsTableProps) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {
          header: 'Barang',
          cell: ({ row }) => (
            <>
              <div className="font-semibold">{row.original.name}</div>
              <div className="text-xs text-base-content/60">per {row.original.unit}</div>
            </>
          ),
        }),
        columnHelper.accessor('stock', {
          header: 'Stok',
          cell: ({ row }) => `${formatQuantity(row.original.stock)} ${row.original.unit}`,
        }),
        columnHelper.accessor('buyPrice', {
          header: 'Harga beli',
          cell: ({ getValue }) => formatRupiah(getValue()),
        }),
        columnHelper.accessor('sellPrice', {
          header: 'Harga jual',
          cell: ({ getValue }) => formatRupiah(getValue()),
        }),
        ...(canEdit
          ? [
              columnHelper.display({
                id: 'actions',
                header: 'Aksi',
                cell: ({ row }) => (
                  <div className="text-right">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onEdit(row.original.id)}
                    >
                      Ubah harga
                    </button>
                  </div>
                ),
              }),
            ]
          : []),
      ]),
    [canEdit, onEdit],
  )
  const table = useTable({ features, columns, data: products })

  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}
