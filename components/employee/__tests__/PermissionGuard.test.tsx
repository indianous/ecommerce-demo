import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PermissionGuard } from '../PermissionGuard'
import { useAuthStore } from '@/stores/auth.store'
import type { EmployeePermission } from '@/types'

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

function makeEmployee(permissions: EmployeePermission[] = []) {
  return {
    isAuthenticated: true,
    accessToken: 'tok',
    role: 'EMPLOYEE' as const,
    user: {
      id: '1',
      name: 'Funcionário',
      email: 'func@test.com',
      role: 'EMPLOYEE' as const,
      permissions,
      phone: null,
      birthDate: null,
      gender: 'PREFIRO_NAO_DIZER' as const,
    },
  }
}

afterEach(async () => {
  await act(async () => {
    useAuthStore.setState({ accessToken: null, user: null, role: null, isAuthenticated: false })
  })
  replaceMock.mockClear()
})

describe('PermissionGuard', () => {
  it('renderiza children quando usuário tem a permissão requerida', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_ORDERS']))

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('basta ter ao menos uma das permissões para renderizar', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_SHIPPING']))

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS', 'MANAGE_SHIPPING', 'MANAGE_ORDER_STATUS_REQUESTS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redireciona para /dashboard quando usuário não tem nenhuma das permissões', async () => {
    useAuthStore.setState(makeEmployee(['MANAGE_PRODUCTS']))

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
  })

  it('redireciona para /dashboard quando isAuthenticated=true e permissions=[]', async () => {
    useAuthStore.setState(makeEmployee([]))

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_CUSTOMERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
  })

  it('não renderiza children enquanto não está autenticado (evita flash)', async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null, role: null })

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
  })

  it('não redireciona enquanto não está autenticado (aguarda hydration)', async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null, accessToken: null, role: null })

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('admin com role ADMIN e sem permissions vê o conteúdo', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: 'tok',
      role: 'ADMIN' as const,
      user: {
        id: '1',
        name: 'Admin',
        email: 'admin@test.com',
        role: 'ADMIN' as const,
        permissions: [],
        phone: null,
        birthDate: null,
        gender: 'PREFIRO_NAO_DIZER' as const,
      },
    })

    await act(async () => {
      render(
        <PermissionGuard permissions={['MANAGE_ORDERS']}>
          <p>conteúdo protegido</p>
        </PermissionGuard>,
      )
    })

    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
