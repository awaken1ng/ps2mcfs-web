import { defineStore, acceptHMRUpdate } from 'pinia'
import { joinPath } from 'lib/utils'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

export const usePathStore = defineStore('path', () => {
  const router = useRouter()

  const current = computed({
    get: () => router.currentRoute.value.path,
    set: (path: string) => router.push({ path })
  })

  const isRoot = computed(() => current.value === '/')

  const components = computed(() => {
    if (isRoot.value) return []
    return current.value.substring(1).split('/')
  })

  const fullComponents = computed(() =>
    components.value.map((_component, idx) =>
      '/' + components.value
        .slice(0, idx + 1)
        .reduce((prev, cur) => `${prev}/${cur}`)
    )
  )

  const goToDirectory = (path: string) => {
    current.value = path
  }

  const goToRoot = () => goToDirectory('/')

  const goUp = () => {
    if (isRoot.value)
      return

    goToDirectory('/' + components.value.slice(0, -1).join('/'))
  }

  const goToLevel = (level: number) => {
    const components2 = []

    for (; level >= 0; level--) {
      const component = components.value[level];
      components2.push(component)
    }
    components2.reverse()

    const fullPath = '/' + components2.join('/')
    goToDirectory(fullPath)
  }

  const join = (path: string) => joinPath(current.value, path)

  return {
    current,
    components,
    fullComponents,
    isRoot,
    join,
    goToDirectory,
    goToRoot,
    goUp,
    goToLevel,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePathStore, import.meta.hot))
}
