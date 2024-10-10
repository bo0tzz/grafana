import { SceneTimeRange } from '@grafana/scenes';
import { default as localStorageStore } from 'app/core/store';
import { DashboardModel } from 'app/features/dashboard/state';
import {
  DASHBOARD_FROM_LS_KEY,
  removeDashboardToFetchFromLocalStorage,
} from 'app/features/dashboard/state/initDashboard';
import { DashboardDTO } from 'app/types';

import { DashboardScene } from '../scene/DashboardScene';
import { buildGridItemForPanel } from '../serialization/transformSaveModelToScene';

export function addPanelsOnLoadBehavior(scene: DashboardScene) {
  const dto = localStorageStore.getObject<DashboardDTO>(DASHBOARD_FROM_LS_KEY);

  if (dto) {
    const model = new DashboardModel(dto.dashboard);

    for (const panel of model.panels) {
      const gridItem = buildGridItemForPanel(panel);
      scene.addPanel(gridItem.state.body);
    }

    if (dto.dashboard.time) {
      const newTimeRange = new SceneTimeRange({ from: dto.dashboard.time.from, to: dto.dashboard.time.to });
      const timeRange = scene.state.$timeRange;
      if (timeRange) {
        timeRange.setState({
          value: newTimeRange.state.value,
          from: newTimeRange.state.from,
          to: newTimeRange.state.to,
        });
      }
    }
  }

  removeDashboardToFetchFromLocalStorage();
}
