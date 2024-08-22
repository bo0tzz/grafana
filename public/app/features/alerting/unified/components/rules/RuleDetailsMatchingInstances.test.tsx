import { times } from 'lodash';
import { render } from 'test/test-utils';
import { byLabelText, byRole, byTestId } from 'testing-library-selector';

import { PluginExtensionTypes } from '@grafana/data';
import { usePluginLinkExtensions } from '@grafana/runtime';

import { CombinedRuleNamespace } from '../../../../../types/unified-alerting';
import { GrafanaAlertState, PromAlertingRuleState } from '../../../../../types/unified-alerting-dto';
import { mockCombinedRule, mockDataSource, mockPromAlert, mockPromAlertingRule } from '../../mocks';
import { alertStateToReadable } from '../../utils/rules';

import { RuleDetailsMatchingInstances } from './RuleDetailsMatchingInstances';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getPluginLinkExtensions: jest.fn(),
  usePluginLinkExtensions: jest.fn(),
}));

const mocks = {
  usePluginLinkExtensionsMock: jest.mocked(usePluginLinkExtensions),
};

const ui = {
  stateFilter: byTestId('alert-instance-state-filter'),
  stateButton: byRole('radio'),
  grafanaStateButton: {
    normal: byLabelText(/^Normal/),
    alerting: byLabelText(/^Alerting/),
    pending: byLabelText(/^Pending/),
    noData: byLabelText(/^NoData/),
    error: byLabelText(/^Error/),
  },
  cloudStateButton: {
    firing: byLabelText(/^Firing/),
    pending: byLabelText(/^Pending/),
  },
  instanceRow: byTestId('row'),
  showAllInstances: byTestId('show-all'),
};

describe('RuleDetailsMatchingInstances', () => {
  beforeEach(() => {
    mocks.usePluginLinkExtensionsMock.mockReturnValue({
      extensions: [
        {
          pluginId: 'grafana-ml-app',
          id: '1',
          type: PluginExtensionTypes.link,
          title: 'Run investigation',
          category: 'Sift',
          description: 'Run a Sift investigation for this alert',
          onClick: jest.fn(),
        },
      ],
      isLoading: false,
    });
  });

  describe('Filtering', () => {
    it('For Grafana Managed rules instances filter should contain five states', () => {
      const rule = mockCombinedRule();

      render(<RuleDetailsMatchingInstances rule={rule} enableFiltering />);

      const stateFilter = ui.stateFilter.get();
      expect(stateFilter).toBeInTheDocument();

      const stateButtons = ui.stateButton.getAll(stateFilter);

      expect(stateButtons).toHaveLength(5);

      expect(ui.grafanaStateButton.normal.get(stateFilter)).toBeInTheDocument();
      expect(ui.grafanaStateButton.alerting.get(stateFilter)).toBeInTheDocument();
      expect(ui.grafanaStateButton.pending.get(stateFilter)).toBeInTheDocument();
      expect(ui.grafanaStateButton.noData.get(stateFilter)).toBeInTheDocument();
      expect(ui.grafanaStateButton.error.get(stateFilter)).toBeInTheDocument();
    });

    it.each(Object.values(GrafanaAlertState))('Should filter grafana rules by %s state', async (state) => {
      const rule = mockCombinedRule({
        promRule: mockPromAlertingRule({
          alerts: [
            mockPromAlert({ state: GrafanaAlertState.Normal }),
            mockPromAlert({ state: GrafanaAlertState.Alerting }),
            mockPromAlert({ state: GrafanaAlertState.Pending }),
            mockPromAlert({ state: GrafanaAlertState.NoData }),
            mockPromAlert({ state: GrafanaAlertState.Error }),
          ],
        }),
      });

      const buttons = {
        [GrafanaAlertState.Normal]: ui.grafanaStateButton.normal,
        [GrafanaAlertState.Alerting]: ui.grafanaStateButton.alerting,
        [GrafanaAlertState.Pending]: ui.grafanaStateButton.pending,
        [GrafanaAlertState.NoData]: ui.grafanaStateButton.noData,
        [GrafanaAlertState.Error]: ui.grafanaStateButton.error,
      };

      const { user } = render(<RuleDetailsMatchingInstances rule={rule} enableFiltering />);

      await user.click(buttons[state].get());

      expect(ui.instanceRow.getAll()).toHaveLength(1);
      expect(ui.instanceRow.get()).toHaveTextContent(alertStateToReadable(state));
    });

    it('For Cloud rules instances filter should contain two states', () => {
      const rule = mockCombinedRule({
        namespace: mockPromNamespace(),
      });

      render(<RuleDetailsMatchingInstances rule={rule} enableFiltering />);

      const stateFilter = ui.stateFilter.get();
      expect(stateFilter).toBeInTheDocument();

      const stateButtons = ui.stateButton.getAll(stateFilter);

      expect(stateButtons).toHaveLength(2);

      expect(ui.cloudStateButton.firing.get(stateFilter)).toBeInTheDocument();
      expect(ui.cloudStateButton.pending.get(stateFilter)).toBeInTheDocument();
    });

    it.each([PromAlertingRuleState.Pending, PromAlertingRuleState.Firing] as const)(
      'Should filter cloud rules by %s state',
      async (state) => {
        const rule = mockCombinedRule({
          namespace: mockPromNamespace(),
          promRule: mockPromAlertingRule({
            alerts: [
              mockPromAlert({ state: PromAlertingRuleState.Firing }),
              mockPromAlert({ state: PromAlertingRuleState.Pending }),
            ],
          }),
        });

        const { user } = render(<RuleDetailsMatchingInstances rule={rule} enableFiltering />);

        await user.click(ui.cloudStateButton[state].get());

        expect(ui.instanceRow.getAll()).toHaveLength(1);
        expect(ui.instanceRow.get()).toHaveTextContent(alertStateToReadable(state));
      }
    );

    it('should correctly filter instances', async () => {
      const rule = mockCombinedRule({
        promRule: mockPromAlertingRule({
          alerts: times(100, () => mockPromAlert({ state: GrafanaAlertState.Normal })),
        }),
        instanceTotals: {
          inactive: 100,
        },
      });

      const { user } = render(
        <RuleDetailsMatchingInstances rule={rule} enableFiltering pagination={{ itemsPerPage: 10 }} />
      );

      // should show all instances by default
      expect(ui.showAllInstances.query()).not.toBeInTheDocument();

      // filter by "error" state, should have no instances in that state
      await user.click(ui.grafanaStateButton.error.get());

      // click "show all" instances
      await user.click(ui.showAllInstances.get());
      expect(ui.showAllInstances.query()).not.toBeInTheDocument();
    });
  });
});

function mockPromNamespace(): CombinedRuleNamespace {
  return {
    rulesSource: mockDataSource(),
    groups: [{ name: 'Prom rules group', rules: [], totals: {} }],
    name: 'Prometheus-test',
  };
}
