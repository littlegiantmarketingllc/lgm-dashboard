import { useGHLAccounts } from './useGHLAccounts'

// No billing sheet. All data comes directly from GHL Agency API.
export function useMergedHealthData() {
  const ghl = useGHLAccounts()

  const accounts = ghl.accounts.map((g, i) => ({
    id:               g.ghlId,
    accountName:      g.ghlName,
    locationId:       g.ghlId,
    ghlId:            g.ghlId,
    ghlEmail:         g.ghlEmail,
    ghlPhone:         g.ghlPhone,
    ghlCity:          g.ghlCity,
    ghlState:         g.ghlState,
    ghlCountry:       g.ghlCountry,
    ghlWebsite:       g.ghlWebsite,
    ghlTimezone:      g.ghlTimezone,
    ghlDateAdded:     g.ghlDateAdded,
    ghlDateUpdated:   g.ghlDateUpdated,
    ghlDaysSinceUpdate: g.ghlDaysSinceUpdate,
    ghlPermissions:   g.ghlPermissions,
    ghlSnapshotId:    g.ghlSnapshotId,
    // Used by date filter + New Customers KPI
    stripeStartDate:  g.ghlDateAdded,
    // Used by health scoring (activity component)
    lastActivity:     g.ghlDaysSinceUpdate,
    // No billing data — all zero
    totalRev:         0,
    planPrice:        0,
    monthlyUserSub:   0,
    users:            0,
    addOns:           0,
    lcWalletCharges:  0,
    transactions:     0,
    annualSubs:       0,
    gp:               0,
    multiLocation:    false,
    accountType:      'GHL Account',
  }))

  const dataSourceStatus = {
    ghlTotal:    ghl.accounts.length,
    sheetTotal:  0,
    matched:     0,
    sheetOnly:   0,
    ghlOnly:     ghl.accounts.length,
    ghlSyncedAt: ghl.syncedAt,
    pendingScopes: [],
  }

  return {
    accounts,
    loading:      ghl.loading,
    sheetLoading: false,
    ghlLoading:   ghl.loading,
    error:        ghl.error,
    ghlError:     ghl.error,
    lastUpdated:  ghl.syncedAt,
    refetch:      ghl.refetch,
    retrying:     false,
    dataSourceStatus,
  }
}
