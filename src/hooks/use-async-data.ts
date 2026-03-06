"use client"

import { useCallback, useEffect, useState } from "react"

import { getErrorMessage } from "~/lib/utils"

interface AsyncDataState<T> {
  data: T
  loading: boolean
  error: string | null
  reload: () => void
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  initialData: T,
  errorFallback: string,
  deps: React.DependencyList = [],
): AsyncDataState<T> {
  const [data, setData] = useState<T>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(getErrorMessage(err, errorFallback))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: () => void load() }
}
