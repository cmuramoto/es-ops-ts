import { RootQuery } from "../search/exports";
import { OpsFactory } from "../api/ies-ops";

const nodeVersion = process.version;

if(parseInt(nodeVersion.substr(1).split('.')[0])<10){
  console.error(`Exiting. Async Generators are supported in node 10+. Please upgrade ${nodeVersion}.`)
  process.exit(1);
}


const ops = OpsFactory("http://localhost:9201");



class PF {
  cpf: number;
}

const __PF = (new PF() as any).__proto__;

const PFMapper = (o: any): PF => {
  o.__proto__ = __PF;
  return o as PF;
};

const humongous_stream = async () => {
  var q = RootQuery.matchAll();

  let ps = 10000;
  let count = 0;
  let total = 0;
  let loops = 0;
  let expectedLoops = 0;

  let stream = ops.asyncStream("pf", q.limit(ps), PFMapper);

  for await (const v of stream) {
    if (count == 0) {
      total = v.total();
      //1 extra since it takes a final round-trip to get an empty result
      expectedLoops = ~~(total / ps) + (total % ps ? 1 : 0);
      console.log(
        `Doc Count: ${total}. Expected Roundtrips: ${expectedLoops} (ps:${ps})`
      );
    }
    count += v.size();
    loops++;

    if (loops % 1000 == 0) {
      console.log(
        `[${new Date()}]: ${loops}/${expectedLoops} (${(
          (100 * loops) /
          expectedLoops
        ).toFixed(2)}%) roundtrips -- ${count}/${total} (${(
          (100 * count) /
          total
        ).toFixed(2)}%) Fetched`
      );
    }
  }

  q = RootQuery.matchAll();
  ops.count("pf", q).then(v => {
    console.log(count);

    if (v != count) {
      console.log(`FUCK. Scroll Count != Query Count: (${count}!=${v})`);
    } else {
      console.log(`Scroll Count == Query Count: (${count}==${v})`);
    }

    if (expectedLoops != loops) {
      console.log(
        `FUCK. Actual Roundtrips != Expected Roundtrips: (${loops}!=${expectedLoops})`
      );
    } else {
      console.log(
        `Actual Roundtrips == Expected Roundtrips: (${loops}==${expectedLoops})`
      );
    }
  });
};

humongous_stream();
