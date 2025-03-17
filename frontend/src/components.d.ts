/**
 * Type declarations for Vue components
 */

declare module '../components/DocumentList.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{
    documents: Array<{ id: string; title: string; userCount: number }>
  }, {}, any>
  export default component
}

declare module '../components/UserList.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../components/EditorToolbar.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../components/ShareModal.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../components/HistoryPanel.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../views/HomeView.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../views/EditorView.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
