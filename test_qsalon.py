from datetime import datetime, timedelta
import unittest

from qsalon import SalonManagementSystem, TenantIsolationError


class SalonManagementSystemTests(unittest.TestCase):
    def test_appointments_are_isolated_per_tenant(self) -> None:
        system = SalonManagementSystem()
        tenant_a = system.create_tenant("Tenant A")
        tenant_b = system.create_tenant("Tenant B")

        salon_a = system.add_salon(tenant_a, "A Salon")
        customer_a = system.add_customer(tenant_a, "Alice", "111")
        system.book_appointment(
            tenant_a,
            salon_a,
            customer_a,
            "Haircut",
            datetime(2026, 1, 1, 9, 0),
            datetime(2026, 1, 1, 10, 0),
        )

        self.assertEqual(1, len(system.list_appointments(tenant_a)))
        self.assertEqual(0, len(system.list_appointments(tenant_b)))

    def test_cross_tenant_booking_is_rejected(self) -> None:
        system = SalonManagementSystem()
        tenant_a = system.create_tenant("Tenant A")
        tenant_b = system.create_tenant("Tenant B")

        salon_a = system.add_salon(tenant_a, "A Salon")
        customer_b = system.add_customer(tenant_b, "Bob", "222")

        with self.assertRaises(TenantIsolationError):
            system.book_appointment(
                tenant_a,
                salon_a,
                customer_b,
                "Color",
                datetime.now(),
                datetime.now() + timedelta(hours=1),
            )

    def test_invalid_time_range_is_rejected(self) -> None:
        system = SalonManagementSystem()
        tenant = system.create_tenant("Tenant A")
        salon = system.add_salon(tenant, "A Salon")
        customer = system.add_customer(tenant, "Alice", "111")

        start = datetime(2026, 1, 1, 10, 0)
        with self.assertRaises(ValueError):
            system.book_appointment(
                tenant,
                salon,
                customer,
                "Trim",
                start,
                start,
            )


if __name__ == "__main__":
    unittest.main()
