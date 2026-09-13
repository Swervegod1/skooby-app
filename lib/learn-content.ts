export type GuideDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type GuideCategory = 'Bitcoin' | 'Ethereum' | 'Markets' | 'Workflow' | 'Safety';

export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  minutes: number;
  widget?: 'gas' | 'bitcoin-address' | 'transaction-flow';
  sections: Array<{ heading: string; body: string }>;
};

export const guides: Guide[] = [
  {
    slug: 'track-bitcoin-address',
    title: 'How to track a Bitcoin address',
    description: 'Read confirmed activity, UTXOs, counterparties, and transaction direction without guessing.',
    category: 'Bitcoin',
    difficulty: 'Beginner',
    minutes: 7,
    widget: 'bitcoin-address',
    sections: [
      { heading: 'Start with the address, not the owner', body: 'A Bitcoin address is an on-chain identifier, not proof of a real-world identity. Begin by measuring activity, balance flow, and recurring counterparties before attaching labels.' },
      { heading: 'Follow inputs and outputs', body: 'Inputs reveal which previous outputs were spent. Outputs show where value moved next. The same transaction can contain payment outputs, fees, and a change output back to the sender.' },
      { heading: 'Build a trail', body: 'Save addresses that matter, compare repeated counterparties, and preserve timestamps and transaction IDs. Skooby’s tracker can turn these relationships into a node graph.' },
    ],
  },
  {
    slug: 'bitcoin-change-outputs',
    title: 'Bitcoin change outputs explained',
    description: 'Understand why a transaction can send value to a recipient and back to the sender at the same time.',
    category: 'Bitcoin',
    difficulty: 'Intermediate',
    minutes: 6,
    widget: 'transaction-flow',
    sections: [
      { heading: 'Bitcoin spends whole UTXOs', body: 'Bitcoin does not subtract a partial amount from an account balance. A transaction spends one or more full unspent outputs and creates new outputs.' },
      { heading: 'Change is normal', body: 'If the selected inputs exceed the payment plus fee, the remainder is usually returned to a new address controlled by the sender.' },
      { heading: 'Why analysts care', body: 'Mistaking change for a second recipient can produce a false trail. Transaction structure, address reuse, and wallet behavior all matter when interpreting flows.' },
    ],
  },
  {
    slug: 'ethereum-gas-fee',
    title: 'How to calculate an Ethereum gas fee',
    description: 'Turn gas limit, base fee, and priority fee into a practical ETH and USD cost estimate.',
    category: 'Ethereum',
    difficulty: 'Beginner',
    minutes: 5,
    widget: 'gas',
    sections: [
      { heading: 'Gas measures computation', body: 'A simple ETH transfer uses less gas than a complicated smart-contract interaction. The gas limit is the maximum amount of gas a transaction may consume.' },
      { heading: 'Fee per gas', body: 'Under EIP-1559, the base fee is determined by network demand and the priority fee is the tip offered to validators. Your effective fee is measured in gwei per gas.' },
      { heading: 'Estimate before signing', body: 'Multiply gas used by the effective gas price, convert gwei to ETH, then multiply by ETH/USD if you want a fiat estimate.' },
    ],
  },
  {
    slug: 'read-market-moves',
    title: 'Read crypto market moves without chasing noise',
    description: 'Separate price, market cap, liquidity, and volatility so short-term movement has context.',
    category: 'Markets',
    difficulty: 'Intermediate',
    minutes: 8,
    sections: [
      { heading: 'Price is only one signal', body: 'A percentage move matters more when you compare it with market capitalization, liquidity, and whether the move is broad or isolated.' },
      { heading: 'Use consistent windows', body: 'Compare like with like. A 24-hour move should not be mixed with a seven-day narrative without noting the difference.' },
    ],
  },
  {
    slug: 'investigation-workflow',
    title: 'Build a repeatable wallet investigation workflow',
    description: 'Use a casebook, labels, transaction graphs, and saved alerts to keep research reproducible.',
    category: 'Workflow',
    difficulty: 'Advanced',
    minutes: 10,
    widget: 'transaction-flow',
    sections: [
      { heading: 'Preserve your starting point', body: 'Record the chain, address, timestamp, and reason the address matters before following any links.' },
      { heading: 'Separate observations from conclusions', body: 'Write down what the chain proves separately from what you infer. This makes the investigation easier to review later.' },
      { heading: 'Use graph structure', body: 'Node graphs reveal hubs, repeated counterparties, fan-out behavior, and bridges between clusters faster than a flat transaction table.' },
    ],
  },
  {
    slug: 'wallet-safety',
    title: 'Wallet research safety checklist',
    description: 'Research addresses without exposing seed phrases, signing unknown messages, or trusting unverified labels.',
    category: 'Safety',
    difficulty: 'Beginner',
    minutes: 4,
    sections: [
      { heading: 'Public data stays public', body: 'You never need a seed phrase or private key to investigate a public blockchain address.' },
      { heading: 'Treat signatures as actions', body: 'A wallet signature can authorize more than a login. Read every signing request and verify the domain and requested action.' },
    ],
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}

export const guideCategories: GuideCategory[] = ['Bitcoin', 'Ethereum', 'Markets', 'Workflow', 'Safety'];
