import {clsx, type ClassValue} from 'clsx'
import {twMerge} from 'tailwind-merge'

/** Merge order wins over specificity order, so a caller's override actually overrides. */
export const cx = (...parts: ClassValue[]) => twMerge(clsx(parts))
