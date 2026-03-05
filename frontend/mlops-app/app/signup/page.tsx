import SignupForm from "@/app/signup/SignupForm";
import {Cpu} from 'lucide-react'

export default function SignupPage() {
    return (
        <div className={'min-h-screen flex items-center justify-center'}>
            <div className='flex flex-col gap-5'>
                <div className='flex items-center justify-center gap-2'>
                    <Cpu/>
                    <p className='font-bold text-xl'>MLOps Studio</p>
                </div>
                <SignupForm/>
            </div>
        </div>
    )
}