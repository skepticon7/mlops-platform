export interface SignupFormValues {
    firstName: string
    lastName: string
    email: string
    password: string
}

export interface LoginFormValues {
    email: string
    password: string
}

export interface LoginResponse {
    access_token: string
    token_type: string
    id: string
    email: string
}

export interface AuthUser {
    id: string
    firstName: string
    lastName: string
    email: string
}
