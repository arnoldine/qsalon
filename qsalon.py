from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4


class TenantIsolationError(ValueError):
    pass


@dataclass(frozen=True)
class Salon:
    id: str
    tenant_id: str
    name: str


@dataclass(frozen=True)
class Customer:
    id: str
    tenant_id: str
    name: str
    phone: str


@dataclass(frozen=True)
class Appointment:
    id: str
    tenant_id: str
    salon_id: str
    customer_id: str
    service_name: str
    start_time: datetime
    end_time: datetime


@dataclass
class TenantData:
    name: str
    salons: Dict[str, Salon] = field(default_factory=dict)
    customers: Dict[str, Customer] = field(default_factory=dict)
    appointments: Dict[str, Appointment] = field(default_factory=dict)


class SalonManagementSystem:
    def __init__(self) -> None:
        self._tenants: Dict[str, TenantData] = {}

    def create_tenant(self, name: str) -> str:
        tenant_id = self._new_id()
        self._tenants[tenant_id] = TenantData(name=name)
        return tenant_id

    def add_salon(self, tenant_id: str, name: str) -> str:
        tenant = self._require_tenant(tenant_id)
        salon_id = self._new_id()
        tenant.salons[salon_id] = Salon(id=salon_id, tenant_id=tenant_id, name=name)
        return salon_id

    def add_customer(self, tenant_id: str, name: str, phone: str) -> str:
        tenant = self._require_tenant(tenant_id)
        customer_id = self._new_id()
        tenant.customers[customer_id] = Customer(
            id=customer_id, tenant_id=tenant_id, name=name, phone=phone
        )
        return customer_id

    def book_appointment(
        self,
        tenant_id: str,
        salon_id: str,
        customer_id: str,
        service_name: str,
        start_time: datetime,
        end_time: datetime,
    ) -> str:
        if end_time <= start_time:
            raise ValueError("Appointment end_time must be after start_time")

        tenant = self._require_tenant(tenant_id)
        if salon_id not in tenant.salons:
            raise TenantIsolationError("Salon does not belong to tenant")
        if customer_id not in tenant.customers:
            raise TenantIsolationError("Customer does not belong to tenant")

        appointment_id = self._new_id()
        tenant.appointments[appointment_id] = Appointment(
            id=appointment_id,
            tenant_id=tenant_id,
            salon_id=salon_id,
            customer_id=customer_id,
            service_name=service_name,
            start_time=start_time,
            end_time=end_time,
        )
        return appointment_id

    def list_appointments(
        self, tenant_id: str, salon_id: Optional[str] = None
    ) -> List[Appointment]:
        tenant = self._require_tenant(tenant_id)
        appointments = list(tenant.appointments.values())
        if salon_id is None:
            return appointments
        if salon_id not in tenant.salons:
            raise TenantIsolationError("Salon does not belong to tenant")
        return [appointment for appointment in appointments if appointment.salon_id == salon_id]

    def _require_tenant(self, tenant_id: str) -> TenantData:
        try:
            return self._tenants[tenant_id]
        except KeyError as exc:
            raise KeyError(f"Unknown tenant_id: {tenant_id}") from exc

    @staticmethod
    def _new_id() -> str:
        return str(uuid4())
