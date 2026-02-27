# Deployment Notes

1. Build contract:
   - `npm run build --workspace @vaulttap/contracts`
2. Use TON wallet + deployment tool (Blueprint/Ton CLI) with generated artifacts in `generated/`.
3. Set `owner` to VaultTap treasury address.
4. For airdrop, call `BatchAirdrop` in chunks (recommended 50-200 recipients per tx).

This folder is intentionally minimal and ready to be connected to your preferred deployment stack.
