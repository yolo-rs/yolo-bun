// SPDX-License-Identifier: Apache-2.0
// Native .NET 9/10 + Win32 P/Invoke Accelerator for PowerShell 7 (pwsh) & Bun
// Based on Microsoft Learn High-Performance System.IO.Enumeration.FileSystemEnumerable & Win32 APIs

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Enumeration;
using System.Runtime;
using System.Runtime.InteropServices;
using System.Text;

namespace Yolo
{
    public struct DirStats
    {
        public ulong Files;
        public ulong Directories;
        public ulong TotalBytes;
        public double ElapsedMilliseconds;
    }

    public static class FastShell
    {
        private const uint ABOVE_NORMAL_PRIORITY_CLASS = 0x00008000;
        private const uint PROCESS_POWER_THROTTLING_CURRENT_VERSION = 1;
        private const uint PROCESS_POWER_THROTTLING_EXECUTION_SPEED = 0x1;
        private const int ProcessPowerThrottling = 4;

        [StructLayout(LayoutKind.Sequential)]
        private struct PROCESS_POWER_THROTTLING_STATE
        {
            public uint Version;
            public uint ControlMask;
            public uint StateMask;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetCurrentProcess();

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetPriorityClass(IntPtr hProcess, uint dwPriorityClass);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetProcessInformation(
            IntPtr hProcess,
            int ProcessInformationClass,
            ref PROCESS_POWER_THROTTLING_STATE ProcessInformation,
            uint ProcessInformationSize
        );

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleOutputCP(uint wCodePageID);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetConsoleCP(uint wCodePageID);

        /// <summary>
        /// Boosts current pwsh/dotnet process priority, disables Windows 11 EcoQoS throttling,
        /// configures SustainedLowLatency GC, and forces UTF-8 console encoding.
        /// </summary>
        public static bool OptimizeWin32Shell()
        {
            try
            {
                GCSettings.LatencyMode = GCLatencyMode.SustainedLowLatency;
                Console.OutputEncoding = new UTF8Encoding(false);
                Console.InputEncoding = new UTF8Encoding(false);

                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    IntPtr hProc = GetCurrentProcess();
                    SetPriorityClass(hProc, ABOVE_NORMAL_PRIORITY_CLASS);

                    var throttle = new PROCESS_POWER_THROTTLING_STATE
                    {
                        Version = PROCESS_POWER_THROTTLING_CURRENT_VERSION,
                        ControlMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
                        StateMask = 0 // Disable EcoQoS throttling
                    };
                    SetProcessInformation(hProc, ProcessPowerThrottling, ref throttle, (uint)Marshal.SizeOf<PROCESS_POWER_THROTTLING_STATE>());
                    SetConsoleOutputCP(65001);
                    SetConsoleCP(65001);
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Zero-PSObject-overhead directory enumeration using .NET FileSystemEnumerable with 64KB kernel fetch buffer.
        /// </summary>
        public static List<string> FastFind(string rootPath, string matchPattern = "*", bool recurse = true, int maxResults = 5000)
        {
            var options = new EnumerationOptions
            {
                RecurseSubdirectories = recurse,
                IgnoreInaccessible = true,
                AttributesToSkip = 0,
                BufferSize = 65536,
                ReturnSpecialDirectories = false
            };

            var enumerable = new FileSystemEnumerable<string>(
                rootPath,
                (ref FileSystemEntry entry) => entry.ToFullPath(),
                options)
            {
                ShouldIncludePredicate = (ref FileSystemEntry entry) =>
                    matchPattern == "*" || FileSystemName.MatchesSimpleExpression(matchPattern, entry.FileName)
            };

            var results = new List<string>(Math.Min(maxResults, 1024));
            foreach (var item in enumerable)
            {
                results.Add(item);
                if (results.Count >= maxResults) break;
            }
            return results;
        }

        /// <summary>
        /// Fast directory statistics using FileSystemEnumerable without allocating FileInfo objects.
        /// </summary>
        public static DirStats FastDirStats(string rootPath, bool recurse = false)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            ulong files = 0, dirs = 0, bytes = 0;

            var options = new EnumerationOptions
            {
                RecurseSubdirectories = recurse,
                IgnoreInaccessible = true,
                AttributesToSkip = 0,
                BufferSize = 65536,
                ReturnSpecialDirectories = false
            };

            var enumerable = new FileSystemEnumerable<int>(
                rootPath,
                (ref FileSystemEntry entry) =>
                {
                    if (entry.IsDirectory)
                    {
                        dirs++;
                    }
                    else
                    {
                        files++;
                        bytes += (ulong)entry.Length;
                    }
                    return 0;
                },
                options);

            foreach (var _ in enumerable) { }
            sw.Stop();

            return new DirStats
            {
                Files = files,
                Directories = dirs,
                TotalBytes = bytes,
                ElapsedMilliseconds = sw.Elapsed.TotalMilliseconds
            };
        }

        /// <summary>
        /// Instant directory prefix resolver (replaces slow Get-ChildItem | Sort-Object in PowerShell startup).
        /// </summary>
        public static string ResolveLatestSubdir(string parentDir, string prefix)
        {
            if (!Directory.Exists(parentDir)) return string.Empty;
            string best = string.Empty;
            foreach (var dir in Directory.EnumerateDirectories(parentDir, prefix + "*"))
            {
                if (string.CompareOrdinal(dir, best) > 0)
                {
                    best = dir;
                }
            }
            return best;
        }
    }
}
