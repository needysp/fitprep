"""exercise ownership + guide_url

Adds Exercise.created_by_user_id (NULL = global catalog, set = private to that
user) and renames fitundaktiv_url -> guide_url (neutral: any guide link).

Revision ID: 628fc8d46387
Revises: 952f020d89e3
Create Date: 2026-07-27 18:27:56.166765

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.database import NAMING_CONVENTION

# revision identifiers, used by Alembic.
revision: str = '628fc8d46387'
down_revision: Union[str, Sequence[str], None] = '952f020d89e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # naming_convention lets batch mode re-create the table despite the original
    # unnamed UNIQUE constraint on exercises.name.
    with op.batch_alter_table(
        'exercises', schema=None, naming_convention=NAMING_CONVENTION
    ) as batch_op:
        batch_op.add_column(
            sa.Column('guide_url', sa.String(length=512), nullable=False, server_default='')
        )
        batch_op.add_column(sa.Column('created_by_user_id', sa.Integer(), nullable=True))
        batch_op.create_index(
            batch_op.f('ix_exercises_created_by_user_id'), ['created_by_user_id'], unique=False
        )
        batch_op.create_index(batch_op.f('ix_exercises_name'), ['name'], unique=False)
        batch_op.create_foreign_key(
            'fk_exercises_created_by_user_id_users',
            'users',
            ['created_by_user_id'],
            ['id'],
            ondelete='CASCADE',
        )
        # The old global-unique name is replaced by per-owner uniqueness enforced
        # in the API (SQLite treats NULL owners as distinct).
        batch_op.drop_constraint('uq_exercises_name', type_='unique')
        batch_op.drop_column('fitundaktiv_url')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table(
        'exercises', schema=None, naming_convention=NAMING_CONVENTION
    ) as batch_op:
        batch_op.add_column(
            sa.Column('fitundaktiv_url', sa.VARCHAR(length=512), nullable=False, server_default='')
        )
        batch_op.create_unique_constraint('uq_exercises_name', ['name'])
        batch_op.drop_constraint('fk_exercises_created_by_user_id_users', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_exercises_name'))
        batch_op.drop_index(batch_op.f('ix_exercises_created_by_user_id'))
        batch_op.drop_column('created_by_user_id')
        batch_op.drop_column('guide_url')
