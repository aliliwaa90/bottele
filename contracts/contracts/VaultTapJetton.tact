// VaultTap Jetton-like contract template for TON.
// This version focuses on reliable compilation and core mint/transfer/burn flow.

message(0x1001) Mint {
  recipient: Address;
  amount: Int as coins;
}

message(0x1003) Transfer {
  to: Address;
  amount: Int as coins;
}

message(0x1004) Burn {
  amount: Int as coins;
}

contract VaultTapJetton {
  owner: Address;
  totalSupply: Int as coins;
  balances: map<Address, Int>;

  init(owner: Address) {
    self.owner = owner;
    self.totalSupply = 0;
    self.balances = emptyMap();
  }

  fun balanceOrZero(account: Address): Int {
    let b = self.balances.get(account);
    if (b == null) {
      return 0;
    }
    return b!!;
  }

  receive(msg: Mint) {
    require(sender() == self.owner, "OWNER_ONLY");
    let current = self.balanceOrZero(msg.recipient);
    self.balances.set(msg.recipient, current + msg.amount);
    self.totalSupply = self.totalSupply + msg.amount;
  }

  receive(msg: Transfer) {
    let from = sender();
    let fromBalance = self.balanceOrZero(from);
    require(fromBalance >= msg.amount, "INSUFFICIENT_BALANCE");

    self.balances.set(from, fromBalance - msg.amount);

    let toBalance = self.balanceOrZero(msg.to);
    self.balances.set(msg.to, toBalance + msg.amount);
  }

  receive(msg: Burn) {
    let from = sender();
    let balance = self.balanceOrZero(from);
    require(balance >= msg.amount, "INSUFFICIENT_BALANCE");

    self.balances.set(from, balance - msg.amount);
    self.totalSupply = self.totalSupply - msg.amount;
  }

  get fun balanceOf(account: Address): Int {
    return self.balanceOrZero(account);
  }

  get fun getTotalSupply(): Int {
    return self.totalSupply;
  }

  get fun getOwner(): Address {
    return self.owner;
  }
}
