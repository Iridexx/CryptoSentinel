const RELEASES_API = 'https://api.github.com/repos/iridexx/test_app_cloude/releases/latest';

export interface UpdateResult {
  available: boolean;
  releaseDate: string;
  buildNumber: string | null;
  downloadUrl: string | null;
}

export async function checkForUpdates(currentBuildDate: string): Promise<UpdateResult> {
  const res = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  const release = await res.json();

  const releaseDate = new Date(release.published_at as string);
  const appDate = new Date(currentBuildDate);
  const available = releaseDate > appDate;

  const apkAsset = (release.assets as { name: string; browser_download_url: string }[])
    ?.find((a) => a.name.endsWith('.apk'));

  const buildMatch = (release.name as string)?.match(/Build (\d+)/);

  return {
    available,
    releaseDate: releaseDate.toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    buildNumber: buildMatch ? buildMatch[1] : null,
    downloadUrl: apkAsset?.browser_download_url ?? null,
  };
}

export function downloadAndInstall(url: string): void {
  window.open(url, '_system');
}
