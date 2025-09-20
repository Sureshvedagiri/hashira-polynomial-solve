// Recover the constant term c = P(0) from shares using Lagrange interpolation at x=0.
// Shares are given as: { [x]: { base: "b", value: "digitsInBaseB" }, ... }

function parseInBaseToBigInt(str, base) {
  const b = BigInt(base);
  let res = 0n;
  for (const ch of str.trim()) {
    const code = ch.toUpperCase().charCodeAt(0);
    let digit;
    if (code >= 48 && code <= 57) digit = code - 48;        // '0'..'9'
    else if (code >= 65 && code <= 90) digit = 10 + code - 65; // 'A'..'Z'
    else throw new Error(`Invalid digit '${ch}'`);
    if (digit >= base) throw new Error(`Digit '${ch}' not valid for base ${base}`);
    res = res * b + BigInt(digit);
  }
  return res;
}

function absBig(n) { return n < 0n ? -n : n; }

function gcdBig(a, b) {
  a = absBig(a); b = absBig(b);
  while (b !== 0n) { const t = a % b; a = b; b = t; }
  return a;
}

// Add two fractions (n1/d1) + (n2/d2), reduce, and keep denominator positive
function addFrac(n1, d1, n2, d2) {
  let num = n1 * d2 + n2 * d1;
  let den = d1 * d2;
  const g = gcdBig(num, den);
  num /= g; den /= g;
  if (den < 0n) { den = -den; num = -num; }
  return [num, den];
}

// Multiply and reduce a fraction by another fraction
function mulFrac(n1, d1, n2, d2) {
  let num = n1 * n2;
  let den = d1 * d2;
  const g = gcdBig(num, den);
  num /= g; den /= g;
  if (den < 0n) { den = -den; num = -num; }
  return [num, den];
}

// Compute P(0) using k shares via Lagrange interpolation at x = 0.
function lagrangeAtZero(shares) {
  // shares: [{ x: BigInt, y: BigInt }, ...] length = k
  let sumNum = 0n, sumDen = 1n; // running fraction = sumNum/sumDen

  for (let i = 0; i < shares.length; i++) {
    const xi = shares[i].x;
    const yi = shares[i].y;

    // Build Li(0) = Π_{j≠i} (0 - xj) / (xi - xj)
    let num = 1n, den = 1n;
    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue;
      const xj = shares[j].x;
      num *= -xj;           // (0 - xj)
      den *= (xi - xj);     // (xi - xj)

      // Light reduction each step to keep numbers small
      const g = gcdBig(num, den);
      if (g > 1n) { num /= g; den /= g; }
    }

    // term = yi * Li(0)
    let [tNum, tDen] = mulFrac(yi, 1n, num, den);
    [sumNum, sumDen] = addFrac(sumNum, sumDen, tNum, tDen);
  }

  if (sumDen !== 1n && (sumNum % sumDen) !== 0n) {
    throw new Error(`Non-integer result: ${sumNum}/${sumDen}`);
  }
  return sumNum / sumDen; // BigInt
}

function findConstantTermC(data) {
  const k = Number(data.keys.k);

  // Collect shares (x, y) and sort by x
  const shares = Object.keys(data)
    .filter(key => key !== "keys")
    .map(xStr => {
      const base = Number(data[xStr].base);
      const yStr = data[xStr].value;
      const x = BigInt(parseInt(xStr, 10));
      const y = parseInBaseToBigInt(yStr, base);
      return { x, y };
    })
    .sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));

  if (shares.length < k) {
    throw new Error(`Need at least k=${k} shares, got ${shares.length}`);
  }

  // Use the first k shares deterministically (any k shares work)
  const selected = shares.slice(0, k);
  const c = lagrangeAtZero(selected);
  return c; // BigInt
}

// ---- Sample run with your test case ----
const jsonData = {
  "keys": { "n": 4, "k": 3 },
  "1": { "base": "10", "value": "4" },
  "2": { "base": "2",  "value": "111" },
  "3": { "base": "10", "value": "12" },
  "6": { "base": "4",  "value": "213" }
};

const jsonData2 = {

    "keys": {
        "n": 4,
        "k": 3
    },
    "1": {
        "base": "10",
        "value": "4"
    },
    "2": {
        "base": "2",
        "value": "111"
    },
    "3": {
        "base": "10",
        "value": "12"
    },
    "6": {
        "base": "4",
        "value": "213"
    }
};

const c = findConstantTermC(jsonData2);
console.log("Constant term c =", c.toString()); // -> "3"
