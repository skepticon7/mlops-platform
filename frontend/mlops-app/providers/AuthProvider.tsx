"use client"

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api-client"
import { STORAGE_KEYS } from "@/lib/constants"
import type { AuthUser, LoginResponse } from "@/types/auth.types"

interface AuthState {
    user: AuthUser | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
}

export interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
    })

    /* ── Restore session from localStorage on mount ── */
    useEffect(() => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
        const userJson = localStorage.getItem(STORAGE_KEYS.USER)

        if (token && userJson) {
            try {
                const user: AuthUser = JSON.parse(userJson)
                setState({ user, token, isAuthenticated: true, isLoading: false })
            } catch {
                localStorage.removeItem(STORAGE_KEYS.TOKEN)
                localStorage.removeItem(STORAGE_KEYS.USER)
                setState((s) => ({ ...s, isLoading: false }))
            }
        } else {
            setState((s) => ({ ...s, isLoading: false }))
        }
    }, [])

    /* ── Login ── */
    const login = useCallback(
        async (email: string, password: string) => {
            const data = await apiFetch<LoginResponse>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            })

            // Fetch full user profile with the new token
            let user: AuthUser
            try {
                const profile = await apiFetch<AuthUser>("/auth/me", {
                    token: data.access_token,
                })
                user = {
                    id: profile.id,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    email: profile.email,
                }
            } catch {
                // Fallback if /me fails — use data from login response
                user = {
                    id: data.id,
                    firstName: "",
                    lastName: "",
                    email: data.email,
                }
            }

            localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token)
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))

            setState({
                user,
                token: data.access_token,
                isAuthenticated: true,
                isLoading: false,
            })

            router.push("/dashboard")
        },
        [router],
    )

    /* ── Logout ── */
    const logout = useCallback(async () => {
        if (state.token) {
            try {
                await apiFetch("/auth/logout", {
                    method: "POST",
                    token: state.token,
                })
            } catch {
                // Ignore — we still clear local state
            }
        }

        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)

        setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
        })

        router.push("/login")
    }, [state.token, router])

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
    return ctx
}
