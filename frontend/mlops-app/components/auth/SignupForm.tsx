"use client"

import { Formik, Form } from "formik"
import * as Yup from "yup"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api-client"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import ErrorAlert from "@/components/ui/ErrorAlert"
import type { SignupFormValues } from "@/types/auth.types"

const validationSchema = Yup.object({
    firstName: Yup.string()
        .min(1, "First name is required")
        .required("First name is required"),
    lastName: Yup.string()
        .min(1, "Last name is required")
        .required("Last name is required"),
    email: Yup.string()
        .email("Please enter a valid email")
        .required("Email is required"),
    password: Yup.string()
        .min(6, "Password must be at least 6 characters")
        .max(20, "Password must be at most 20 characters")
        .required("Password is required"),
})

const initialValues: SignupFormValues = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
}

export default function SignupForm() {
    const router = useRouter()
    const [serverError, setServerError] = useState<string | null>(null)

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            validateOnMount={false}
            onSubmit={async (values, { setSubmitting }) => {
                setServerError(null)
                setSubmitting(true)
                try {
                    await apiFetch("/auth/register", {
                        method: "POST",
                        body: JSON.stringify(values),
                    })
                    router.push("/login")
                } catch (e: unknown) {
                    setServerError(
                        e instanceof Error ? e.message : "Registration failed",
                    )
                } finally {
                    setSubmitting(false)
                }
            }}
        >
            {({ isSubmitting }) => (
                <Form className="flex flex-col gap-[15px]">
                    <div className="grid grid-cols-2 gap-[10px]">
                        <FormField
                            id="firstName"
                            name="firstName"
                            label="First name"
                            placeholder="Jane"
                        />
                        <FormField
                            id="lastName"
                            name="lastName"
                            label="Last name"
                            placeholder="Doe"
                        />
                    </div>

                    <FormField
                        id="email"
                        name="email"
                        label="Email"
                        type="email"
                        placeholder="you@company.com"
                    />

                    <FormField
                        id="password"
                        name="password"
                        label="Password"
                        type="password"
                        placeholder="Min. 6 characters"
                    />

                    {serverError && <ErrorAlert message={serverError} />}

                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        loadingText="Creating…"
                    >
                        Create account
                    </Button>
                </Form>
            )}
        </Formik>
    )
}
