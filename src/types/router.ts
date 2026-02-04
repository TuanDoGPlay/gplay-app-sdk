import type { RouteComponent } from 'vue-router'

export interface RouterConfig {
    name: string;
    path: string;
    component: RouteComponent;
}
