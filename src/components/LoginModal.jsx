"use client";
import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, KeyRound } from 'lucide-react'
import useAuthStore from '@/store/authStore'

export default function LoginModal({ isOpen, onOpenChange }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuthStore()

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    const success = login(username, password)
    if (success) {
      onOpenChange(false)
      setUsername('')
      setPassword('')
    } else {
      setError('用户名或密码错误')
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-lg duration-200 sm:rounded-2xl animate-in fade-in zoom-in-95">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[hsl(var(--primary))]" />
              管理员登录
            </Dialog.Title>
            <Dialog.Description className="text-sm text-[hsl(var(--muted-foreground))]">
              请输入管理员账号和密码以进入管理模式。
            </Dialog.Description>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                用户名
              </label>
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm ring-offset-[hsl(var(--background))] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                placeholder="请输入用户名"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm ring-offset-[hsl(var(--background))] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[hsl(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                placeholder="请输入密码"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))/0.9] h-10 px-4 py-2 w-full mt-2"
            >
              登录
            </button>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-[hsl(var(--background))] transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:pointer-events-none"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
