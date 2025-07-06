const StellarSdk = require('@stellar/stellar-sdk');
const xdr = StellarSdk.xdr;

function fullEventLog(events: any[]): any[] {
    console.log("=== SOROBAN FULL EVENT LOG ===");
    console.log({events});
    const ids = events.map((e: any) => e.id);
    return StellarSdk.humanizeEvents(
      events.map((event: any) => {
        // rebuild the decomposed response into its original XDR structure
        return new xdr.ContractEvent({
          contractId: event.contractId.address().toBuffer(),
          type: xdr.ContractEventType.contract(), // since we filtered on 'contract'
          body: new xdr.ContractEventBody(
            0,
            new xdr.ContractEventV0({
              topics: event.topic,
              data: event.value,
            }),
          ),
        });
      }),
    ).map((e: any, idx: number) => { return { id: ids[idx], ...e } });
  }

  function bigIntToString(obj: any): any {
    if (typeof obj === 'bigint') {
        return obj.toString();
    } else if (Array.isArray(obj)) {
        return obj.map(bigIntToString);
    } else if (obj && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, bigIntToString(v)])
        );
    }
    return obj;
}

export { fullEventLog, bigIntToString };