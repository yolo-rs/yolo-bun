// SPDX-License-Identifier: MIT OR Apache-2.0
#include <compare>

std::partial_ordering yolo_partial_ordering(double left, double right) {
    return left <=> right;
}
