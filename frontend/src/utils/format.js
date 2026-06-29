import { format, formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

export const formatDate = (date, fmt = 'dd MMM yyyy') =>
  format(new Date(date), fmt, { locale: id })

export const formatDateTime = (date) =>
  format(new Date(date), 'dd MMM yyyy HH:mm', { locale: id })

export const timeAgo = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: id })

export const formatCurrency = (amount, currency = 'IDR') =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(amount)

export const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n)

export const formatPercent = (n, decimals = 1) => `${Number(n).toFixed(decimals)}%`
