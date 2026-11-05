// SPDX-License-Identifier: MIT OR Apache-2.0
function checksum(limit: number): number {
  let sum = 0;
  for (let i = 0; i < limit; i++) sum += i;
  return sum;
}

console.log(`yolo-aot:${checksum(100)}`);
