Cette demande est très large (6 pages, 30+ métriques, nouvelles tables, exports, logs temps réel). Pour livrer proprement et éviter de tout casser, je propose de la découper en lots livrables. Dis-moi par où commencer ou si je fais tout dans l'ordre proposé.

## Lot 1 — Dashboard enrichi (page Vue d'ensemble)
Ajouter les cartes manquantes calculées depuis l'historique persistant et `/balance` :
- Solde total (depuis `balance` Freqtrade)
- P&L Mensuel
- ROI total, Winrate %, Trades ouverts, Trades fermés
- Durée moyenne d'un trade
- Profit Factor (∑gains / |∑pertes|)
- Sharpe Ratio (sur P&L journaliers, rf=0)
- Max Drawdown (depuis equity curve)
- Total Wins / Total Losses
- Meilleur trade / Pire trade
Réorganisation en grille compacte style TradingView (déjà en place).

## Lot 2 — Trades ouverts en direct
Nouvelle page `/open` (ou section dédiée) :
- Tableau temps réel via `useFreqtrade("status", 3000)`
- Colonnes : Paire, Direction, Entrée, Prix actuel, Taille, Levier, PnL %, PnL USDT, Durée, SL, TP, Statut
- Recherche, tri colonnes, filtre direction, couleurs gain/perte
- Lien dans la sidebar

## Lot 3 — Historique avancé
Améliorer `/trades` :
- Filtres : période (date range), paire (select), résultat (win/loss/all)
- Pagination (50/page)
- Export CSV de la vue filtrée
- Colonne Frais (depuis `raw.fee_close + fee_open` si dispo)

## Lot 4 — Analytics étendu
Étendre `/analytics` :
- Equity curve (existe)
- P&L journalier (existe), Hebdo, Mensuel (agrégations)
- Évolution du winrate (rolling 20)
- Drawdown chart
- Distribution profits (histogramme)
- Distribution durée
- Long vs Short (barres comparées)
- Top 5 / Flop 5 paires

## Lot 5 — Risk Management
Nouvelle page `/risk` :
- Exposition actuelle (∑ stake_amount ouverts)
- Usage marge (exposition / bankroll)
- Risque par trade (depuis SL si défini)
- Drawdown % courant
- Risque positions ouvertes (perte si SL touchés)
- Allocation portefeuille (donut par paire)
- Exposition au levier (∑ stake × leverage)
- Estimation risque de liquidation (par position)

## Lot 6 — Logs temps réel
Nouvelle page `/logs` :
- Endpoint proxy `logs` (ajout dans `freqtrade-proxy`)
- Polling 3s, auto-scroll, filtre niveau (INFO/WARN/ERROR), recherche, pause/reprise

## Détails techniques
- Calculs (Sharpe, Profit Factor, Max DD) centralisés dans `src/lib/metrics.ts` (nouveau)
- Ajout endpoint `logs` dans `supabase/functions/freqtrade-proxy/index.ts`
- Pas de nouveau schéma DB nécessaire (tout dérive de `trade_history` + Freqtrade API)
- Sidebar mise à jour avec : Vue d'ensemble, Trades ouverts, Historique, Analytique, Risque, Logs, Paramètres

## Question
Veux-tu que j'enchaîne tous les lots dans l'ordre, ou je commence par un sous-ensemble (ex. Lots 1+2+5 d'abord) ?