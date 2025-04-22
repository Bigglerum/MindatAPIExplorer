import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a safe HTML string with dangerouslySetInnerHTML
 * Use this for content from trusted sources like API data that includes HTML tags
 * @param html HTML string to create safe object from
 * @returns Object to use with dangerouslySetInnerHTML
 */
export function createMarkup(html: string | null) {
  return {
    __html: html || ''
  };
}
