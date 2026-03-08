/**
 * Returns the JavaScript source code of an `applySvgPath(ctx, d)` runtime
 * helper function. This string is spliced into generated Node.js code so that
 * custom shapes and Lucide icons can be drawn without relying on `Path2D`
 * (which node-canvas does not implement).
 */
export function getSvgPathHelperCode(): string {
  return `
function applySvgPath(ctx, d) {
  var nums = function(s) {
    var r = [], m;
    var re = /[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?/gi;
    while ((m = re.exec(s)) !== null) r.push(+m[0]);
    return r;
  };
  var segs = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
  var cx = 0, cy = 0, sx = 0, sy = 0;
  var cpx = 0, cpy = 0, prevCmd = "";
  ctx.beginPath();
  for (var i = 0; i < segs.length; i++) {
    var cmd = segs[i][0];
    var p = nums(segs[i].slice(1));
    var j = 0;
    do {
      switch (cmd) {
        case "M":
          cx = p[j++]; cy = p[j++]; ctx.moveTo(cx, cy);
          sx = cx; sy = cy; cmd = "L"; break;
        case "m":
          cx += p[j++]; cy += p[j++]; ctx.moveTo(cx, cy);
          sx = cx; sy = cy; cmd = "l"; break;
        case "L":
          cx = p[j++]; cy = p[j++]; ctx.lineTo(cx, cy); break;
        case "l":
          cx += p[j++]; cy += p[j++]; ctx.lineTo(cx, cy); break;
        case "H":
          cx = p[j++]; ctx.lineTo(cx, cy); break;
        case "h":
          cx += p[j++]; ctx.lineTo(cx, cy); break;
        case "V":
          cy = p[j++]; ctx.lineTo(cx, cy); break;
        case "v":
          cy += p[j++]; ctx.lineTo(cx, cy); break;
        case "C":
          var c1x = p[j++], c1y = p[j++], c2x = p[j++], c2y = p[j++];
          var ex = p[j++], ey = p[j++];
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          cpx = c2x; cpy = c2y; cx = ex; cy = ey; break;
        case "c":
          var c1x = cx+p[j++], c1y = cy+p[j++], c2x = cx+p[j++], c2y = cy+p[j++];
          var ex = cx+p[j++], ey = cy+p[j++];
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          cpx = c2x; cpy = c2y; cx = ex; cy = ey; break;
        case "S":
          var rx = "CcSs".indexOf(prevCmd) >= 0 ? 2*cx-cpx : cx;
          var ry = "CcSs".indexOf(prevCmd) >= 0 ? 2*cy-cpy : cy;
          var c2x = p[j++], c2y = p[j++], ex = p[j++], ey = p[j++];
          ctx.bezierCurveTo(rx, ry, c2x, c2y, ex, ey);
          cpx = c2x; cpy = c2y; cx = ex; cy = ey; break;
        case "s":
          var rx = "CcSs".indexOf(prevCmd) >= 0 ? 2*cx-cpx : cx;
          var ry = "CcSs".indexOf(prevCmd) >= 0 ? 2*cy-cpy : cy;
          var c2x = cx+p[j++], c2y = cy+p[j++], ex = cx+p[j++], ey = cy+p[j++];
          ctx.bezierCurveTo(rx, ry, c2x, c2y, ex, ey);
          cpx = c2x; cpy = c2y; cx = ex; cy = ey; break;
        case "Q":
          cpx = p[j++]; cpy = p[j++]; var ex = p[j++], ey = p[j++];
          ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          cx = ex; cy = ey; break;
        case "q":
          cpx = cx+p[j++]; cpy = cy+p[j++]; var ex = cx+p[j++], ey = cy+p[j++];
          ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          cx = ex; cy = ey; break;
        case "T":
          cpx = "QqTt".indexOf(prevCmd) >= 0 ? 2*cx-cpx : cx;
          cpy = "QqTt".indexOf(prevCmd) >= 0 ? 2*cy-cpy : cy;
          var ex = p[j++], ey = p[j++];
          ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          cx = ex; cy = ey; break;
        case "t":
          cpx = "QqTt".indexOf(prevCmd) >= 0 ? 2*cx-cpx : cx;
          cpy = "QqTt".indexOf(prevCmd) >= 0 ? 2*cy-cpy : cy;
          var ex = cx+p[j++], ey = cy+p[j++];
          ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          cx = ex; cy = ey; break;
        case "A": case "a": {
          var arx = p[j++], ary = p[j++], rot = p[j++] * Math.PI / 180;
          var fa = p[j++], fs = p[j++];
          var ex = cmd === "A" ? p[j++] : cx + p[j++];
          var ey = cmd === "A" ? p[j++] : cy + p[j++];
          var dx2 = (cx - ex) / 2, dy2 = (cy - ey) / 2;
          var cosR = Math.cos(rot), sinR = Math.sin(rot);
          var x1p = cosR * dx2 + sinR * dy2;
          var y1p = -sinR * dx2 + cosR * dy2;
          var rxSq = arx * arx, rySq = ary * ary;
          var x1pSq = x1p * x1p, y1pSq = y1p * y1p;
          var lambda = x1pSq / rxSq + y1pSq / rySq;
          if (lambda > 1) { arx *= Math.sqrt(lambda); ary *= Math.sqrt(lambda); rxSq = arx*arx; rySq = ary*ary; }
          var num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
          var den = rxSq * y1pSq + rySq * x1pSq;
          var sq = Math.sqrt(num / den) * (fa === fs ? -1 : 1);
          var cxp = sq * arx * y1p / ary;
          var cyp = sq * -ary * x1p / arx;
          var mx = (cx + ex) / 2, my = (cy + ey) / 2;
          var acx = cosR * cxp - sinR * cyp + mx;
          var acy = sinR * cxp + cosR * cyp + my;
          var ang = function(ux, uy, vx, vy) {
            var dp = ux*vx + uy*vy;
            var la = Math.sqrt(ux*ux+uy*uy) * Math.sqrt(vx*vx+vy*vy);
            var c = Math.max(-1, Math.min(1, dp/la));
            return (ux*vy - uy*vx < 0 ? -1 : 1) * Math.acos(c);
          };
          var th1 = ang(1, 0, (x1p - cxp) / arx, (y1p - cyp) / ary);
          var dth = ang((x1p - cxp) / arx, (y1p - cyp) / ary, (-x1p - cxp) / arx, (-y1p - cyp) / ary);
          if (!fs && dth > 0) dth -= 2 * Math.PI;
          if (fs && dth < 0) dth += 2 * Math.PI;
          ctx.ellipse(acx, acy, arx, ary, rot, th1, th1 + dth, !fs);
          cx = ex; cy = ey; break;
        }
        case "Z": case "z":
          ctx.closePath(); cx = sx; cy = sy; j = p.length; break;
      }
      prevCmd = cmd;
    } while (j < p.length);
  }
}
`.trim();
}
