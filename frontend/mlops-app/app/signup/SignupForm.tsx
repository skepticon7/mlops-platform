"use client"
import {Formik, Form, FormikProps, FormikValues} from 'formik'
import * as Yup from 'yup'
import {SignupFormValues} from "@/src/types/auth.types";

const validationSchema = Yup.object({
    fistName : Yup.string().required("First name is required"),
    lastName : Yup.string().required("Last name is required"),
    email : Yup.string().email("Email is required"),
    password : Yup.string().min(6).max(20).required("Password is required"),
})

export default function SignupForm() {

    const initialValues: SignupFormValues = {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    }

    return (
        <div className='border-gray-200/30 rounded-md border-1 p-6'>
            <div className='space-y-2'>
                <h1 className='font-bold text-lg'>Welcome Back</h1>
                <p className={'text-sm text-text-secondary'}>Sign in to continue to your workspace</p>
            </div>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                validateOnMount={false}
                onSubmit={async (values , {setSubmitting}) : Promise<void> => {
                    setSubmitting(true)
                    try {
                        // api call
                        console.log("successfully registered")
                    }catch (e) {
                        console.log(e);
                    }finally {
                        setSubmitting(false);
                    }
                }}
            >
                {({ isValid, isSubmitting }: FormikProps<SignupFormValues>) => (
                    <Form>
                        <button
                            type="submit"
                            disabled={!isValid || isSubmitting}
                            className="mt-4 bg-black text-white px-4 py-2 rounded"
                        >
                            Sign Up
                        </button>
                    </Form>
                )}
            </Formik>
        </div>
    )
}