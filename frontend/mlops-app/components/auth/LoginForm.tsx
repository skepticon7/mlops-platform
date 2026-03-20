"use client"

import { Formik, Form } from "formik"
import * as Yup from "yup"
import { useAuth } from "@/hooks/use-auth"
import { useState } from "react"
import FormField from "@/components/ui/FormField"
import Button from "@/components/ui/Button"
import ErrorAlert from "@/components/ui/ErrorAlert"
import type { LoginFormValues } from "@/types/auth.types"

const validationSchema = Yup.object({
    email: Yup.string()
        .email("Please enter a valid email")
        .required("Email is required"),
    password: Yup.string()
        .min(1, "Password is required")
        .required("Password is required"),
})

const initialValues: LoginFormValues = { email: "", password: "" }

export default function LoginForm() {
    const { login } = useAuth()
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
                    await login(values.email, values.password)
                } catch (e: unknown) {
                    setServerError(
                        e instanceof Error ? e.message : "Login failed",
                    )
                } finally {
                    setSubmitting(false)
                }
            }}
        >
            {({ isSubmitting }) => (
                <Form className="flex flex-col gap-[15px]">
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
                        placeholder="••••••••"
                        trailing={
                            <span className="text-[12px] text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
                                Forgot?
                            </span>
                        }
                    />

                    {serverError && <ErrorAlert message={serverError} />}

                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        loadingText="Signing in…"
                    >
                        Sign in
                    </Button>
                </Form>
            )}
        </Formik>
    )
}
