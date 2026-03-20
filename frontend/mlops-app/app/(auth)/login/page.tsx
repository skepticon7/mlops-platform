import Link from "next/link"
import LoginForm from "@/components/auth/LoginForm"

export default function LoginPage() {
    return (
        <>
            <h1 className="text-[19px] font-semibold text-text-primary mb-1">
                Welcome back
            </h1>
            <p className="text-[13px] text-text-secondary mb-[22px]">
                Sign in to continue to your workspace
            </p>

            <LoginForm />

            <p className="text-center mt-[18px] text-[13px] text-text-tertiary">
                No account?{" "}
                <Link
                    href="/signup"
                    className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                    Sign up free
                </Link>
            </p>
        </>
    )
}
