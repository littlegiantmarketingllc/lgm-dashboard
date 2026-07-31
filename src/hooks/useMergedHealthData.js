import { useMemo } from 'react'
import { useHealthSheet } from './useHealthSheet'
import { useGHLAccounts } from './useGHLAccounts'

// Strip non-alphanumeric for fuzzy name matching (handles "2nd State Insurance Agency"
// vs "2nd State Insurance" and similar minor differences in how names appear)
function norm(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function useMergedHealthData() {
  const sheet = useHealthSheet()
  const ghl   = useGHLAccounts()

  // Build GHL lookup maps: by ID (exact) and by normalized name (fuzzy)
  const ghlById   = useMemo(() => {
    const m = {}
    ghl.accounts.forEach(a => { m[a.ghlId] = a })
    return m
  }, [ghl.accounts])

  const ghlByName = useMemo(() => {
    const m = {}
    ghl.accounts.forEach(a => { m[norm(a.ghlName)] = a })
    return m
  }, [ghl.accounts])

  // Enrich every sheet account with whatever GHL can provide
  const enrichedSheet = useMemo(() => {
    return sheet.accounts.map(acc => {
      const ghlMatch =
        (acc.locationId && ghlById[acc.locationId]) ||
        ghlByName[norm(acc.accountName)]

      if (!ghlMatch) return { ...acc, _ghlMatch: false }

      return {
        ...acc,
        // Always use GHL's canonical location ID
        locationId:         ghlMatch.ghlId,
        // Use GHL join date if the sheet's stripeStartDate is empty
        stripeStartDate:    acc.stripeStartDate || ghlMatch.ghlDateAdded,
        // GHL's dateUpdated → days since last activity (proxy for login activity)
        lastActivity:       ghlMatch.ghlDaysSinceUpdate ?? acc.lastActivity,
        // GHL location fields (bonus data not in the sheet)
        ghlCity:            ghlMatch.ghlCity,
        ghlState:           ghlMatch.ghlState,
        ghlEmail:           ghlMatch.ghlEmail,
        ghlPhone:           ghlMatch.ghlPhone,
        ghlWebsite:         ghlMatch.ghlWebsite,
        ghlTimezone:        ghlMatch.ghlTimezone,
        ghlDateAdded:       ghlMatch.ghlDateAdded,
        ghlDateUpdated:     ghlMatch.ghlDateUpdated,
        ghlPermissions:     ghlMatch.ghlPermissions,
        // Pending fields — null signals "available once GHL scope is granted"
        ghlUserCount:       ghlMatch.ghlUserCount,
        ghlContactCount:    ghlMatch.ghlContactCount,
        ghlTransactions:    ghlMatch.ghlTransactions,
        ghlLcWallet:        ghlMatch.ghlLcWallet,
        ghlOpportunities:   ghlMatch.ghlOpportunities,
        _ghlMatch:          true,
        _ghlId:             ghlMatch.ghlId,
      }
    })
  }, [sheet.accounts, ghlById, ghlByName])

  // Track which GHL accounts are already covered by the sheet
  const sheetCoverage = useMemo(() => {
    const ids   = new Set(sheet.accounts.map(a => a.locationId).filter(Boolean))
    const names = new Set(sheet.accounts.map(a => norm(a.accountName)))
    return { ids, names }
  }, [sheet.accounts])

  // GHL-only accounts: exist in GHL but not yet in the billing sheet.
  // Shown in the master table so John can see which accounts are untracked.
  // Excluded from health scoring tables (at-risk, upsell) to avoid noise.
  const ghlOnlyAccounts = useMemo(() => {
    return ghl.accounts
      .filter(g =>
        !sheetCoverage.ids.has(g.ghlId) &&
        !sheetCoverage.names.has(norm(g.ghlName))
      )
      .map((g, i) => ({
        id:               `ghl-${i}`,
        accountName:      g.ghlName,
        accountType:      'Unknown',
        locationId:       g.ghlId,
        stripeStartDate:  g.ghlDateAdded,
        lastActivity:     g.ghlDaysSinceUpdate,
        totalRev:         0,
        planPrice:        0,
        monthlyUserSub:   0,
        users:            0,
        addOns:           0,
        lcWalletCharges:  0,
        transactions:     0,
        subAcntCount:     0,
        annualSubs:       0,
        multiLocation:    false,
        gp:               0,
        agencyGrossProfit: 0,
        lcAgencyCosts:    0,
        lcAgencyGrossProfit: 0,
        // GHL fields
        ghlCity:          g.ghlCity,
        ghlState:         g.ghlState,
        ghlEmail:         g.ghlEmail,
        ghlPhone:         g.ghlPhone,
        ghlWebsite:       g.ghlWebsite,
        ghlTimezone:      g.ghlTimezone,
        ghlDateAdded:     g.ghlDateAdded,
        ghlDateUpdated:   g.ghlDateUpdated,
        ghlPermissions:   g.ghlPermissions,
        ghlUserCount:     g.ghlUserCount,
        ghlContactCount:  g.ghlContactCount,
        ghlTransactions:  g.ghlTransactions,
        ghlLcWallet:      g.ghlLcWallet,
        ghlOpportunities: g.ghlOpportunities,
        _ghlMatch:        true,
        _ghlOnly:         true, // in GHL, not in billing sheet
        _ghlId:           g.ghlId,
      }))
  }, [ghl.accounts, sheetCoverage])

  const accounts = useMemo(
    () => [...enrichedSheet, ...ghlOnlyAccounts],
    [enrichedSheet, ghlOnlyAccounts]
  )

  // Summary for the data source banner
  const dataSourceStatus = useMemo(() => ({
    ghlTotal:      ghl.accounts.length,
    sheetTotal:    sheet.accounts.length,
    matched:       enrichedSheet.filter(a => a._ghlMatch).length,
    sheetOnly:     enrichedSheet.filter(a => !a._ghlMatch).length,
    ghlOnly:       ghlOnlyAccounts.length,
    ghlSyncedAt:   ghl.syncedAt,
    sheetSyncedAt: sheet.lastUpdated,
    ghlError:      ghl.error,
    pendingScopes: ['Users', 'Contacts', 'Transactions', 'LC Wallet'],
  }), [ghl, sheet, enrichedSheet, ghlOnlyAccounts])

  return {
    accounts,
    // Loading: block render only while BOTH are still loading
    loading:      sheet.loading && ghl.loading,
    sheetLoading: sheet.loading,
    ghlLoading:   ghl.loading,
    error:        sheet.error,
    ghlError:     ghl.error,
    lastUpdated:  sheet.lastUpdated,
    refetch:      sheet.refetch,
    retrying:     sheet.retrying,
    dataSourceStatus,
  }
}
