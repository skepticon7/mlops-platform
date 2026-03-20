import Link from "next/link"
import SignupForm from "@/components/auth/SignupForm"

export default function SignupPage() {
    return (
        <>
            <h1 className="text-[19px] font-semibold text-text-primary mb-1">
                Create your account
            </h1>
            <p className="text-[13px] text-text-secondary mb-[22px]">
                Deploy your first model in minutes
            </p>

            <SignupForm />

            <p className="text-center mt-[18px] text-[13px] text-text-tertiary">
                Have an account?{" "}
                <Link
                    href="/login"
                    className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                    Sign in
                </Link>
            </p>
        </>
    )
}
