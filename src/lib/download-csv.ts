/**
 * Planora AI — Client-Side CSV Download Utility
 *
 * Dispatches authenticated requests to the export route handlers,
 * extracts the server-provided attachment filename from Content-Disposition,
 * and triggers a safe browser file download via Blob URL.
 */

export type DownloadResult =
  | { success: true; error?: never }
  | { success: false; error: string };

/**
 * Triggers a client-side CSV file download from an authorized API endpoint.
 *
 * Invariants:
 * - Extracts Content-Disposition filename if provided by the server.
 * - Cleans up object URLs immediately after click invocation.
 * - Handles non-200 responses, network exceptions, and error JSON payloads cleanly.
 * - Never throws unhandled exceptions to callers.
 */
export async function triggerCsvDownload(
  endpointUrl: string,
  fallbackFilename: string
): Promise<DownloadResult> {
  try {
    const res = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        Accept: "text/csv, application/json",
      },
    });

    if (!res.ok) {
      let errorMessage = `Export failed with status ${res.status}.`;
      try {
        const json = await res.json();
        if (json && typeof json.error === "string") {
          errorMessage = json.error;
        }
      } catch {
        // Response was not JSON
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Extract filename from server Content-Disposition header
    const disposition = res.headers.get("Content-Disposition");
    let filename = fallbackFilename;

    if (disposition) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    window.URL.revokeObjectURL(objectUrl);

    return { success: true };
  } catch (error) {
    console.error("[triggerCsvDownload] Network failure:", error);
    return {
      success: false,
      error: "Network error occurred while downloading. Please check your connection.",
    };
  }
}
