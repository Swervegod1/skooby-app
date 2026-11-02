"""Durable paper exit reconciliation, independent of browsers and chat sessions."""
import argparse
import logging
import os
import time

from .connectors import CoinbasePublic
from .store import Store


def tick(store, venue):
    for user, product in store.open_accounts():
        try:
            market = venue.book(product)
            store.reconcile(user, product, market)
        except Exception:
            # No secrets, remote content, addresses, or request bodies in logs.
            store.anomaly(user)
            logging.warning("Paper reconciliation unavailable; new entries will halt after repeated failures")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    store, venue = Store(os.getenv("ORACLE_DB", "data/oracle.sqlite3")), CoinbasePublic()
    while True:
        tick(store, venue)
        if args.once:
            break
        time.sleep(15)


if __name__ == "__main__":
    main()
