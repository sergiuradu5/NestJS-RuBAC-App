function cleanUpPath(path: string): string {
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  if (path.endsWith('/')) {
    path = path.slice(0, path.length - 1);
  }
  return path;
}

export function checkPath(reqPath: string, rulePath: string): boolean {
  reqPath = cleanUpPath(reqPath);
  rulePath = cleanUpPath(rulePath);
  const reqPathArr = reqPath.split('/');
  const rulePathArr = rulePath.split('/');
  for(const [ind, str ] of reqPathArr.entries()) {
    const s = str.trim(),
      rs = rulePathArr[ind].trim();
    if (rs === '*') {
      return true;
    }
    if (s !== rs) {
      return false;
    }
  };
  return true;
}