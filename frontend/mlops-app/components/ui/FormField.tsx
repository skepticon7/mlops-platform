"use client"

import { Field, ErrorMessage } from "formik"

interface FormFieldProps {
    id: string
    name: string
    label: string
    type?: string
    placeholder?: string
    trailing?: React.ReactNode
}

const INPUT_CLASS =
    "w-full bg-background-muted border border-border rounded-[6px] px-3 py-2 text-[13.5px] text-text-primary font-[var(--font-sans)] outline-none transition-colors duration-150 placeholder:text-text-tertiary focus:border-[#444]"

export default function FormField({
    id,
    name,
    label,
    type = "text",
    placeholder,
    trailing,
}: FormFieldProps) {
    return (
        <div className="flex flex-col gap-[5px]">
            <div className="flex justify-between items-baseline">
                <label
                    htmlFor={id}
                    className="text-[13px] font-medium text-text-primary"
                >
                    {label}
                </label>
                {trailing}
            </div>
            <Field
                id={id}
                name={name}
                type={type}
                placeholder={placeholder}
                className={INPUT_CLASS}
            />
            <ErrorMessage
                name={name}
                component="span"
                className="text-[11.5px] text-danger"
            />
        </div>
    )
}
